import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import { generateTokens, verifyRefreshToken, generateAccessToken } from '../services/jwtService';

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
      tenantId: user.tenantId.toString(),
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
  } catch (error) {
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
      tenantId: user.tenantId.toString(),
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
      tenantId: user.tenantId.toString(),
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
