import { Request, Response } from 'express';
import Role, { DEFAULT_ROLE_PERMISSIONS, IRole } from '../models/Role';
import User from '../models/User';
import { createAuditLog } from './auditController';
import mongoose from 'mongoose';

// Get all roles for tenant
export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Get custom roles from database
    let roles = await Role.find({ tenantId }).lean();

    // If no custom roles exist, create default ones
    if (roles.length === 0) {
      const defaultRoles = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, config]) => ({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        name,
        displayName: config.displayName,
        description: config.description,
        permissions: config.permissions,
        isSystem: true,
      }));

      await Role.insertMany(defaultRoles);
      roles = await Role.find({ tenantId }).lean();
    }

    // Get user counts for each role
    const userCounts = await User.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const userCountMap: Record<string, number> = {};
    userCounts.forEach((item) => {
      userCountMap[item._id] = item.count;
    });

    // Format response
    const rolesWithCounts = roles.map((role) => ({
      id: role.name,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
      isSystem: role.isSystem,
      userCount: userCountMap[role.name] || 0,
    }));

    res.status(200).json({
      success: true,
      data: rolesWithCounts,
    });
  } catch (error) {
    console.error('[Auth Service] Get roles error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
};

// Get single role by name
export const getRoleByName = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { roleName } = req.params;

    const role = await Role.findOne({ tenantId, name: roleName }).lean();

    if (!role) {
      // Check if it's a valid default role
      if (DEFAULT_ROLE_PERMISSIONS[roleName]) {
        const defaultRole = DEFAULT_ROLE_PERMISSIONS[roleName];
        res.status(200).json({
          success: true,
          data: {
            id: roleName,
            name: roleName,
            displayName: defaultRole.displayName,
            description: defaultRole.description,
            permissions: defaultRole.permissions,
            isSystem: true,
            userCount: 0,
          },
        });
        return;
      }

      res.status(404).json({ success: false, message: 'Role not found' });
      return;
    }

    // Get user count for this role
    const userCount = await User.countDocuments({
      tenantId,
      role: roleName,
      status: 'active',
    });

    res.status(200).json({
      success: true,
      data: {
        id: role.name,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
        userCount,
      },
    });
  } catch (error) {
    console.error('[Auth Service] Get role error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch role' });
  }
};

// Update role permissions
export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { roleName } = req.params;
    const { permissions } = req.body;

    // Validate role name
    const validRoles = ['tenant_admin', 'hr', 'manager', 'employee'];
    if (!validRoles.includes(roleName)) {
      res.status(400).json({ success: false, message: 'Invalid role name' });
      return;
    }

    // Cannot modify tenant_admin permissions (always has full access)
    if (roleName === 'tenant_admin') {
      res.status(400).json({
        success: false,
        message: 'Administrator role permissions cannot be modified'
      });
      return;
    }

    // Validate permissions is an array
    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, message: 'Permissions must be an array' });
      return;
    }

    // Find existing role or create new one
    let role = await Role.findOne({ tenantId, name: roleName });

    if (!role) {
      // Create role with updated permissions
      const defaultConfig = DEFAULT_ROLE_PERMISSIONS[roleName];
      role = new Role({
        tenantId,
        name: roleName,
        displayName: defaultConfig.displayName,
        description: defaultConfig.description,
        permissions,
        isSystem: true,
      });
    } else {
      // Track old permissions for audit
      const oldPermissions = role.permissions;
      role.permissions = permissions;

      // Log audit
      const admin = await User.findById(adminUserId);
      if (admin) {
        await createAuditLog(
          tenantId,
          adminUserId,
          admin.email,
          `${admin.firstName} ${admin.lastName}`,
          'UPDATE_ROLE_PERMISSIONS',
          'role',
          'Role',
          { roleName, oldPermissions, newPermissions: permissions },
          {
            resourceId: role._id.toString(),
            changes: [{ field: 'permissions', oldValue: oldPermissions, newValue: permissions }]
          }
        );
      }
    }

    await role.save();

    // Update permissions for all users with this role in this tenant
    await User.updateMany(
      { tenantId: new mongoose.Types.ObjectId(tenantId), role: roleName },
      { $set: { permissions } }
    );

    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        id: role.name,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
    });
  } catch (error) {
    console.error('[Auth Service] Update role permissions error:', error);
    res.status(500).json({ success: false, message: 'Failed to update role permissions' });
  }
};

// Reset role to default permissions
export const resetRoleToDefault = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const adminUserId = req.headers['x-user-id'] as string;
    const { roleName } = req.params;

    // Validate role name
    const validRoles = ['tenant_admin', 'hr', 'manager', 'employee'];
    if (!validRoles.includes(roleName)) {
      res.status(400).json({ success: false, message: 'Invalid role name' });
      return;
    }

    const defaultConfig = DEFAULT_ROLE_PERMISSIONS[roleName];
    const defaultPermissions = defaultConfig.permissions;

    // Update or create role with default permissions
    const role = await Role.findOneAndUpdate(
      { tenantId, name: roleName },
      {
        $set: {
          permissions: defaultPermissions,
          displayName: defaultConfig.displayName,
          description: defaultConfig.description,
        },
      },
      { upsert: true, new: true }
    );

    // Update all users with this role
    await User.updateMany(
      { tenantId: new mongoose.Types.ObjectId(tenantId), role: roleName },
      { $set: { permissions: defaultPermissions } }
    );

    // Log audit
    const admin = await User.findById(adminUserId);
    if (admin) {
      await createAuditLog(
        tenantId,
        adminUserId,
        admin.email,
        `${admin.firstName} ${admin.lastName}`,
        'RESET_ROLE_PERMISSIONS',
        'role',
        'Role',
        { roleName, permissions: defaultPermissions }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Role reset to default permissions',
      data: {
        id: role.name,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions,
        isSystem: role.isSystem,
      },
    });
  } catch (error) {
    console.error('[Auth Service] Reset role error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset role' });
  }
};
