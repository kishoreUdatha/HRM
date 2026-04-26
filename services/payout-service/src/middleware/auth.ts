import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate required headers from API Gateway
 */
export const validateHeaders = (req: Request, res: Response, next: NextFunction): void => {
  const tenantId = req.headers['x-tenant-id'];
  const userId = req.headers['x-user-id'];

  // Skip validation for health check and webhooks
  if (req.path === '/health' || req.path.includes('/webhooks')) {
    next();
    return;
  }

  if (!tenantId) {
    res.status(401).json({
      success: false,
      message: 'Tenant ID is required',
    });
    return;
  }

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User ID is required',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user has required role for payout operations
 */
export const requirePayoutAccess = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.headers['x-user-role'] as string;

    if (!userRole) {
      res.status(403).json({
        success: false,
        message: 'Access denied: User role not found',
      });
      return;
    }

    // Super admin always has access
    if (userRole === 'super_admin') {
      next();
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions for payout operations',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check approver role
 */
export const requireApproverRole = (req: Request, res: Response, next: NextFunction): void => {
  const userRole = req.headers['x-user-role'] as string;
  const allowedRoles = ['super_admin', 'tenant_admin', 'hr', 'finance'];

  if (!userRole || !allowedRoles.includes(userRole)) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Only approvers can perform this action',
    });
    return;
  }

  next();
};
