import { Request, Response, NextFunction } from 'express';

// Permission-based authorization middleware
export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userPermissions = req.headers['x-user-permissions'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userPermissions && !userRole) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Super admin has all permissions
    if (userRole === 'super_admin') {
      next();
      return;
    }

    const permissions = userPermissions ? userPermissions.split(',') : [];

    // Check if user has wildcard permission
    if (permissions.includes('*')) {
      next();
      return;
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some(permission => {
      // Check exact match
      if (permissions.includes(permission)) return true;

      // Check wildcard match (e.g., 'users:*' matches 'users:read')
      const [resource] = permission.split(':');
      if (permissions.includes(`${resource}:*`)) return true;

      return false;
    });

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
        required: requiredPermissions,
      });
      return;
    }

    next();
  };
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers['x-user-role'] as string;

    if (!userRole) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Super admin always allowed
    if (userRole === 'super_admin') {
      next();
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Role not authorized',
        required: allowedRoles,
      });
      return;
    }

    next();
  };
};

// Admin-only middleware (tenant_admin or super_admin)
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = req.headers['x-user-role'] as string;

  if (!userRole) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!['super_admin', 'tenant_admin'].includes(userRole)) {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  next();
};

// HR or Admin middleware
export const requireHROrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = req.headers['x-user-role'] as string;

  if (!userRole) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!['super_admin', 'tenant_admin', 'hr'].includes(userRole)) {
    res.status(403).json({
      success: false,
      message: 'HR or Admin access required',
    });
    return;
  }

  next();
};

// Manager or above middleware
export const requireManagerOrAbove = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = req.headers['x-user-role'] as string;

  if (!userRole) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!['super_admin', 'tenant_admin', 'hr', 'manager'].includes(userRole)) {
    res.status(403).json({
      success: false,
      message: 'Manager or above access required',
    });
    return;
  }

  next();
};
