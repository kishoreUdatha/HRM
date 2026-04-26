import { Request, Response, NextFunction } from 'express';
import { checkAuditorAccess } from '../services/auditorService';

/**
 * Middleware to check if the user has auditor role
 */
export function requireAuditorRole() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'auditor') {
      return res.status(403).json({
        success: false,
        message: 'This action requires Auditor role',
        code: 'AUDITOR_ROLE_REQUIRED'
      });
    }

    next();
  };
}

/**
 * Middleware to check if the user has CA role
 */
export function requireCARole() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers['x-user-role'] as string;

    if (userRole !== 'ca') {
      return res.status(403).json({
        success: false,
        message: 'This action requires Chartered Accountant (CA) role',
        code: 'CA_ROLE_REQUIRED'
      });
    }

    next();
  };
}

/**
 * Middleware to check if the user has auditor or CA role
 */
export function requireAuditorOrCA() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers['x-user-role'] as string;

    if (!['auditor', 'ca'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'This action requires Auditor or CA role',
        code: 'AUDITOR_OR_CA_ROLE_REQUIRED'
      });
    }

    next();
  };
}

/**
 * Middleware to verify auditor has access to the tenant
 */
export function requireAuditorTenantAccess(scope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.headers['x-user-role'] as string;
      const userId = req.headers['x-user-id'] as string;
      const tenantId = req.headers['x-tenant-id'] as string || req.params.tenantId;

      // Non-auditor roles don't need this check
      if (!['auditor', 'ca'].includes(userRole)) {
        return next();
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required',
          code: 'TENANT_ID_REQUIRED'
        });
      }

      const accessCheck = await checkAuditorAccess(
        userId,
        tenantId,
        scope as any
      );

      if (!accessCheck.hasAccess) {
        return res.status(403).json({
          success: false,
          message: accessCheck.reason || 'Access denied',
          code: 'AUDITOR_ACCESS_DENIED'
        });
      }

      // Attach assignment to request for downstream use
      (req as any).auditorAssignment = accessCheck.assignment;
      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify auditor access',
        code: 'ACCESS_VERIFICATION_FAILED'
      });
    }
  };
}

/**
 * Middleware to check if user can verify tax declarations
 */
export function canVerifyTaxDeclarations() {
  return requireAuditorTenantAccess('taxDeclarations');
}

/**
 * Middleware to check if user can verify PF compliance
 */
export function canVerifyPFCompliance() {
  return requireAuditorTenantAccess('pfCompliance');
}

/**
 * Middleware to check if user can verify ESI compliance
 */
export function canVerifyESICompliance() {
  return requireAuditorTenantAccess('esiCompliance');
}

/**
 * Middleware to check if user can access employee data
 */
export function canAccessEmployeeData() {
  return requireAuditorTenantAccess('employeeData');
}

/**
 * Middleware for tenant admin or auditor/CA access
 * Allows tenant admins full access, auditors/CAs get scoped access
 */
export function requireTenantAdminOrAuditor() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.headers['x-user-role'] as string;

    // Super admin and tenant admin have full access
    if (['super_admin', 'tenant_admin'].includes(userRole)) {
      return next();
    }

    // HR also has limited access
    if (userRole === 'hr') {
      return next();
    }

    // Auditors and CAs need assignment verification
    if (['auditor', 'ca'].includes(userRole)) {
      return requireAuditorTenantAccess()(req, res, next);
    }

    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  };
}

export default {
  requireAuditorRole,
  requireCARole,
  requireAuditorOrCA,
  requireAuditorTenantAccess,
  canVerifyTaxDeclarations,
  canVerifyPFCompliance,
  canVerifyESICompliance,
  canAccessEmployeeData,
  requireTenantAdminOrAuditor
};
