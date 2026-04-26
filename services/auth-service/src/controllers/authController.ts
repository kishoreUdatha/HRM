import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import https from 'https';
import User from '../models/User';
import { generateTokens, verifyRefreshToken, generateAccessToken } from '../services/jwtService';

// Employee service URL for internal communication
const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003';
const TENANT_SERVICE_URL = process.env.TENANT_SERVICE_URL || 'http://localhost:3002';

// Log service URLs at startup (helps debug configuration issues)
console.log(`[Auth Controller] EMPLOYEE_SERVICE_URL: ${EMPLOYEE_SERVICE_URL}`);
console.log(`[Auth Controller] TENANT_SERVICE_URL: ${TENANT_SERVICE_URL}`);

// Create axios instance for internal service communication (skip SSL verification for internal Azure Container Apps)
const internalAxios = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 10000,
});

// Helper to resolve company code/slug to tenant ObjectId
const resolveTenantId = async (tenantIdOrSlug: string): Promise<string | null> => {
  // If it's already a valid ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(tenantIdOrSlug)) {
    return tenantIdOrSlug;
  }

  // Otherwise, treat it as a slug/company code and resolve it
  try {
    console.log(`[Auth] Resolving tenant slug: ${tenantIdOrSlug} via ${TENANT_SERVICE_URL}`);
    const response = await internalAxios.get(
      `${TENANT_SERVICE_URL}/by-slug/${tenantIdOrSlug}`
    );
    if (response.data.success && response.data.data?._id) {
      return response.data.data._id;
    }
  } catch (error) {
    console.log(`[Auth] Failed to resolve tenant slug: ${tenantIdOrSlug}`, error);
  }
  return null;
};

// Register new user (for a tenant)
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role, tenantId } = req.body;

    // Validate tenant ID
    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
      res.status(400).json({
        success: false,
        message: 'Valid tenant ID is required',
      });
      return;
    }

    // Check if user already exists for this tenant
    const existingUser = await User.findOne({ tenantId, email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already registered for this organization',
      });
      return;
    }

    // Create new user
    const user = await User.create({
      tenantId,
      email,
      password,
      firstName,
      lastName,
      role: role || 'employee',
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      tenantId: user.tenantId?.toString() || 'platform',
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    // Save refresh token
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(201).json({
      success: true,
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    console.error('[Auth] Register error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });
    next(error);
  }
};

// Login user
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, tenantId } = req.body;

    // Build query - if tenantId provided, use it; otherwise find by email only
    const query: { email: string; tenantId?: mongoose.Types.ObjectId } = { email };
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new mongoose.Types.ObjectId(tenantId);
    }

    // Find user with password
    const user = await User.findOne(query).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      tenantId: user.tenantId?.toString() || 'platform',
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    // Save refresh token (limit to 5 active sessions)
    if (user.refreshTokens.length >= 5) {
      user.refreshTokens = user.refreshTokens.slice(-4);
    }
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.json({
      success: true,
      user: user.toJSON(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Login with mobile number and PIN
// Supports both: 1) User records with mobile credentials, 2) Employee records with selfyPunch enabled
export const loginWithMobile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mobileNumber, pin, tenantId: rawTenantId } = req.body;

    // Resolve tenant ID (might be ObjectId or company code/slug)
    let resolvedTenantId: string | null = null;
    if (rawTenantId) {
      resolvedTenantId = await resolveTenantId(rawTenantId);
      if (!resolvedTenantId) {
        res.status(401).json({
          success: false,
          message: 'Organization not found',
        });
        return;
      }
    }

    // Build query - if tenantId resolved, use it
    const query: { mobileNumber: string; tenantId?: mongoose.Types.ObjectId } = { mobileNumber };
    if (resolvedTenantId && mongoose.Types.ObjectId.isValid(resolvedTenantId)) {
      query.tenantId = new mongoose.Types.ObjectId(resolvedTenantId);
    }

    // First, try to find user in auth database
    const user = await User.findOne(query).select('+pin');

    if (user) {
      // User found in auth database - use existing flow
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact your administrator.',
        });
        return;
      }

      if (!user.pin) {
        res.status(401).json({
          success: false,
          message: 'PIN not set for this account. Please contact your administrator.',
        });
        return;
      }

      const isPinValid = await user.comparePin(pin);
      if (!isPinValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid mobile number or PIN',
        });
        return;
      }

      user.lastLogin = new Date();
      const tokens = generateTokens({
        userId: user._id.toString(),
        tenantId: user.tenantId?.toString() || 'platform',
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      });

      if (user.refreshTokens.length >= 5) {
        user.refreshTokens = user.refreshTokens.slice(-4);
      }
      user.refreshTokens.push(tokens.refreshToken);
      await user.save();

      res.json({
        success: true,
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return;
    }

    // User not found in auth database - try employee-service
    // This allows employees with selfyPunch enabled to login directly
    if (!resolvedTenantId) {
      res.status(401).json({
        success: false,
        message: 'Invalid mobile number or PIN',
      });
      return;
    }

    try {
      console.log(`[Auth] Calling employee service at: ${EMPLOYEE_SERVICE_URL}/employees/verify-mobile-credentials`);
      console.log(`[Auth] Payload: tenantId=${resolvedTenantId}, phone=${mobileNumber}`);

      const employeeResponse = await internalAxios.post(
        `${EMPLOYEE_SERVICE_URL}/employees/verify-mobile-credentials`,
        {
          tenantId: resolvedTenantId,
          phone: mobileNumber,
          pin,
        }
      );

      console.log(`[Auth] Employee service response:`, employeeResponse.data);

      if (employeeResponse.data.success && employeeResponse.data.data) {
        const employeeData = employeeResponse.data.data;

        // Generate tokens for the employee
        const tokens = generateTokens({
          userId: employeeData.employeeId,  // Use employeeId as userId
          tenantId: employeeData.tenantId,
          email: employeeData.email,
          role: 'employee',
          permissions: ['profile:read', 'profile:write', 'attendance:read', 'leaves:read', 'leaves:write'],
        });

        res.json({
          success: true,
          user: {
            _id: employeeData.employeeId,
            tenantId: employeeData.tenantId,
            email: employeeData.email,
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            role: 'employee',
            permissions: ['profile:read', 'profile:write', 'attendance:read', 'leaves:read', 'leaves:write'],
            employeeId: employeeData.employeeId,
            employeeCode: employeeData.employeeCode,
            designation: employeeData.designation,
            department: employeeData.department,
            avatar: employeeData.avatar,
            isActive: true,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
        return;
      }
    } catch (employeeError: any) {
      console.error(`[Auth] Employee service error:`, employeeError.message);
      if (employeeError.response) {
        console.error(`[Auth] Response status:`, employeeError.response.status);
        console.error(`[Auth] Response data:`, employeeError.response.data);
      }
      if (employeeError.code) {
        console.error(`[Auth] Error code:`, employeeError.code);
      }

      // If employee service returns an error response, use its message
      if (axios.isAxiosError(employeeError) && employeeError.response?.data?.message) {
        res.status(employeeError.response.status).json({
          success: false,
          message: employeeError.response.data.message,
        });
        return;
      }

      // For network errors (can't reach employee service), show specific error
      if (employeeError.code === 'ECONNREFUSED' || employeeError.code === 'ENOTFOUND' || employeeError.code === 'ETIMEDOUT') {
        console.error(`[Auth] Network error reaching employee service at ${EMPLOYEE_SERVICE_URL}`);
        res.status(503).json({
          success: false,
          message: 'Unable to verify credentials. Please try again later.',
          debug: process.env.NODE_ENV === 'development' ? `Employee service unreachable: ${employeeError.code}` : undefined,
        });
        return;
      }
      // For other errors, fall through to generic error
    }

    res.status(401).json({
      success: false,
      message: 'Invalid mobile number or PIN',
    });
  } catch (error) {
    next(error);
  }
};

// Logout user
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await User.updateOne(
        { refreshTokens: refreshToken },
        { $pull: { refreshTokens: refreshToken } }
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access token
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      tenantId: user.tenantId?.toString() || 'platform',
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });

    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// Update current user profile
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const { firstName, lastName, mobileNumber } = req.body;

    // Build update object with only allowed fields
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password
    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Set mobile number and PIN for mobile login
export const setMobileCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { mobileNumber, pin } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Update mobile number and PIN
    if (mobileNumber) {
      user.mobileNumber = mobileNumber;
    }
    if (pin) {
      user.pin = pin;
    }
    await user.save();

    res.json({
      success: true,
      message: 'Mobile credentials updated successfully',
      data: {
        mobileNumber: user.mobileNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get users by tenant (for admin)
export const getUsersByTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { page = 1, limit = 10, search, role, status } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = { tenantId };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;
    if (status !== undefined) filter.isActive = status === 'active';

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Register FCM device token for push notifications
export const registerDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { token, platform, deviceId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!token || !platform || !deviceId) {
      res.status(400).json({
        success: false,
        message: 'Token, platform, and deviceId are required',
      });
      return;
    }

    if (!['android', 'ios'].includes(platform)) {
      res.status(400).json({
        success: false,
        message: 'Platform must be android or ios',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Remove existing token for this device (if any)
    user.fcmTokens = user.fcmTokens.filter(t => t.deviceId !== deviceId);

    // Add new token
    user.fcmTokens.push({
      token,
      platform,
      deviceId,
      lastUpdated: new Date(),
      isActive: true,
    });

    // Keep only last 5 devices
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens.slice(-5);
    }

    await user.save();

    console.log(`[Auth] FCM token registered for user ${userId}, device ${deviceId}`);

    res.json({
      success: true,
      message: 'Device token registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Remove FCM device token (on logout)
export const removeDeviceToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { deviceId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required',
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Remove token for this device
    user.fcmTokens = user.fcmTokens.filter(t => t.deviceId !== deviceId);
    await user.save();

    console.log(`[Auth] FCM token removed for user ${userId}, device ${deviceId}`);

    res.json({
      success: true,
      message: 'Device token removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get users with FCM tokens by tenant and roles (internal API for notification service)
export const getUsersWithFCMTokens = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tenantId, roles } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
      return;
    }

    const roleFilter = roles && roles.length > 0 ? { role: { $in: roles } } : {};

    const users = await User.find({
      tenantId,
      ...roleFilter,
      isActive: true,
      'fcmTokens.0': { $exists: true }, // Has at least one FCM token
    }).select('_id firstName lastName email role fcmTokens');

    res.json({
      success: true,
      data: users.map(user => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fcmTokens: user.fcmTokens.filter(t => t.isActive),
      })),
    });
  } catch (error) {
    next(error);
  }
};
