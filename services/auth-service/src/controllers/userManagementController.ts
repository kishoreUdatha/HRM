import { Request, Response } from 'express';
import User from '../models/User';
import { createAuditLog } from './auditController';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Get all users for tenant with filtering
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Auth Service] Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const user = await User.findOne({ _id: id, tenantId })
      .select('-password -refreshTokens')
      .lean();

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error('[Auth Service] Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

// Create new user (admin creates user)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { email, password, firstName, lastName, role, employeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      tenantId,
      employeeId,
      status: 'active',
      isEmailVerified: true, // Admin-created users are pre-verified
    });

    await user.save();

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        'CREATE_USER',
        'user',
        'User',
        { email, role, firstName, lastName },
        { resourceId: user._id.toString() }
      );
    }

    const userResponse = user.toObject();
    delete (userResponse as Record<string, unknown>).password;
    delete (userResponse as Record<string, unknown>).refreshTokens;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse },
    });
  } catch (error) {
    console.error('[Auth Service] Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { firstName, lastName, role, status, employeeId } = req.body;

    const user = await User.findOne({ _id: id, tenantId });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Track changes for audit
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];

    if (firstName && firstName !== user.firstName) {
      changes.push({ field: 'firstName', oldValue: user.firstName, newValue: firstName });
      user.firstName = firstName;
    }
    if (lastName && lastName !== user.lastName) {
      changes.push({ field: 'lastName', oldValue: user.lastName, newValue: lastName });
      user.lastName = lastName;
    }
    if (role && role !== user.role) {
      changes.push({ field: 'role', oldValue: user.role, newValue: role });
      user.role = role;
    }
    if (status && status !== user.status) {
      changes.push({ field: 'status', oldValue: user.status, newValue: status });
      user.status = status;
    }
    if (employeeId !== undefined && employeeId !== user.employeeId?.toString()) {
      changes.push({ field: 'employeeId', oldValue: user.employeeId, newValue: employeeId });
      user.employeeId = employeeId || undefined;
    }

    await user.save();

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin && changes.length > 0) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        'UPDATE_USER',
        'user',
        'User',
        { email: user.email },
        { resourceId: id, changes }
      );
    }

    const userResponse = user.toObject();
    delete (userResponse as Record<string, unknown>).password;
    delete (userResponse as Record<string, unknown>).refreshTokens;

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse },
    });
  } catch (error) {
    console.error('[Auth Service] Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// Update user role
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['tenant_admin', 'hr', 'manager', 'employee'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }

    const user = await User.findOne({ _id: id, tenantId });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        'CHANGE_USER_ROLE',
        'user',
        'User',
        { email: user.email, oldRole, newRole: role },
        { resourceId: id, changes: [{ field: 'role', oldValue: oldRole, newValue: role }] }
      );
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: { userId: id, role },
    });
  } catch (error) {
    console.error('[Auth Service] Update user role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
};

// Activate/Deactivate user
export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    // Prevent self-deactivation
    if (id === adminUserId && status !== 'active') {
      res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
      return;
    }

    const user = await User.findOne({ _id: id, tenantId });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const oldStatus = user.status;
    user.status = status;

    // Invalidate refresh tokens if deactivating
    if (status !== 'active') {
      user.refreshTokens = [];
    }

    await user.save();

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        status === 'active' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        'user',
        'User',
        { email: user.email, status },
        { resourceId: id, changes: [{ field: 'status', oldValue: oldStatus, newValue: status }] }
      );
    }

    res.status(200).json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: { userId: id, status },
    });
  } catch (error) {
    console.error('[Auth Service] Update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

// Reset user password (admin)
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({ _id: id, tenantId });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        'RESET_USER_PASSWORD',
        'user',
        'User',
        { email: user.email },
        { resourceId: id }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('[Auth Service] Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    // Prevent self-deletion
    if (id === adminUserId) {
      res.status(400).json({ success: false, message: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findOne({ _id: id, tenantId });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    user.status = 'inactive';
    user.email = `deleted_${Date.now()}_${user.email}`;
    user.refreshTokens = [];
    await user.save();

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        'DELETE_USER',
        'user',
        'User',
        { email: user.email, firstName: user.firstName, lastName: user.lastName },
        { resourceId: id }
      );
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[Auth Service] Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// Get user statistics
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [totalUsers, byRole, byStatus, recentLogins] = await Promise.all([
      User.countDocuments({ tenantId }),
      User.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.find({ tenantId, lastLogin: { $exists: true } })
        .select('firstName lastName email lastLogin')
        .sort({ lastLogin: -1 })
        .limit(10)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        byRole: Object.fromEntries(byRole.map(r => [r._id, r.count])),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count])),
        recentLogins,
      },
    });
  } catch (error) {
    console.error('[Auth Service] Get user stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user statistics' });
  }
};

// Bulk update users
export const bulkUpdateUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { userIds, action, value } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ success: false, message: 'No users specified' });
      return;
    }

    // Prevent bulk operations on self
    if (userIds.includes(adminUserId)) {
      res.status(400).json({ success: false, message: 'Cannot perform bulk operation on your own account' });
      return;
    }

    let updateQuery: Record<string, unknown> = {};
    let auditAction = '';

    switch (action) {
      case 'activate':
        updateQuery = { status: 'active' };
        auditAction = 'BULK_ACTIVATE_USERS';
        break;
      case 'deactivate':
        updateQuery = { status: 'inactive', refreshTokens: [] };
        auditAction = 'BULK_DEACTIVATE_USERS';
        break;
      case 'change_role':
        if (!value || !['tenant_admin', 'hr', 'manager', 'employee'].includes(value)) {
          res.status(400).json({ success: false, message: 'Invalid role' });
          return;
        }
        updateQuery = { role: value };
        auditAction = 'BULK_CHANGE_ROLE';
        break;
      default:
        res.status(400).json({ success: false, message: 'Invalid action' });
        return;
    }

    const result = await User.updateMany(
      { _id: { $in: userIds }, tenantId },
      updateQuery
    );

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        auditAction,
        'user',
        'User',
        { userIds, action, value, modifiedCount: result.modifiedCount }
      );
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('[Auth Service] Bulk update users error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk update users' });
  }
};
