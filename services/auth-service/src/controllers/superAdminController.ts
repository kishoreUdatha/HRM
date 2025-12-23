import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { generateTokens, generateAccessToken, verifyRefreshToken } from '../services/jwtService';

// Super Admin Login (no tenant context required)
export const superAdminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find super admin user (no tenant filter)
    const user = await User.findOne({ email, role: 'super_admin' }).select('+password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials or not a super admin',
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens (no tenantId for super admin)
    const tokens = generateTokens({
      userId: user._id.toString(),
      tenantId: 'platform', // Special identifier for super admin
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
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        avatar: user.avatar,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// Get current super admin profile
export const getSuperAdminProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const user = await User.findOne({ _id: userId, role: 'super_admin' });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Super admin not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create first super admin (protected - only works if no super admin exists)
export const createSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, firstName, lastName, setupKey } = req.body;

    // Verify setup key (should be set in environment)
    const validSetupKey = process.env.SUPER_ADMIN_SETUP_KEY || 'hrm-super-admin-setup-2024';
    if (setupKey !== validSetupKey) {
      res.status(403).json({
        success: false,
        message: 'Invalid setup key',
      });
      return;
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      res.status(400).json({
        success: false,
        message: 'Super admin already exists. Contact existing super admin for access.',
      });
      return;
    }

    // Create super admin user (no tenantId)
    const superAdmin = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
      isEmailVerified: true,
    });

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      user: {
        _id: superAdmin._id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: superAdmin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// List all super admins (for management)
export const listSuperAdmins = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const superAdmins = await User.find({ role: 'super_admin' })
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: superAdmins,
    });
  } catch (error) {
    next(error);
  }
};

// Create additional super admin (by existing super admin)
export const addSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
      return;
    }

    const superAdmin = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
      isEmailVerified: true,
    });

    res.status(201).json({
      success: true,
      message: 'Super admin added successfully',
      user: {
        _id: superAdmin._id,
        email: superAdmin.email,
        firstName: superAdmin.firstName,
        lastName: superAdmin.lastName,
        role: superAdmin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update super admin status
export const updateSuperAdminStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const requestingUserId = req.headers['x-user-id'] as string;

    // Prevent self-deactivation
    if (id === requestingUserId) {
      res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account',
      });
      return;
    }

    const user = await User.findOneAndUpdate(
      { _id: id, role: 'super_admin' },
      { isActive, status: isActive ? 'active' : 'inactive' },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Super admin not found',
      });
      return;
    }

    res.json({
      success: true,
      message: `Super admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Refresh super admin token
export const refreshSuperAdminToken = async (
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

    // Find super admin and verify refresh token
    const user = await User.findOne({
      _id: decoded.userId,
      role: 'super_admin',
      refreshTokens: refreshToken
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      tenantId: 'platform',
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

// Get platform-wide user statistics
export const getPlatformUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      roleStats,
      recentSignups,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'super_admin' } }),
      User.countDocuments({ role: { $ne: 'super_admin' }, isActive: true }),
      User.aggregate([
        { $match: { role: { $ne: 'super_admin' } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      User.countDocuments({
        role: { $ne: 'super_admin' },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const roleBreakdown: Record<string, number> = {};
    roleStats.forEach((stat: { _id: string; count: number }) => {
      roleBreakdown[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roleBreakdown,
        recentSignups,
        superAdminCount: await User.countDocuments({ role: 'super_admin' }),
      },
    });
  } catch (error) {
    next(error);
  }
};
