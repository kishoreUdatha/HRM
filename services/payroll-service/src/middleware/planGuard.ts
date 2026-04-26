import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const TENANT_SERVICE_URL = process.env.TENANT_SERVICE_URL || 'http://localhost:3002';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-service-key';

// Cache tenant data for 5 minutes to reduce API calls
const tenantCache: Map<string, { data: any; expiresAt: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch tenant data with caching
 */
async function getTenantData(tenantId: string): Promise<any> {
  const cached = tenantCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${TENANT_SERVICE_URL}/internal/${tenantId}`, {
      headers: { 'x-internal-api-key': INTERNAL_API_KEY },
      timeout: 5000
    });

    const data = response.data?.data || response.data;
    tenantCache.set(tenantId, {
      data,
      expiresAt: Date.now() + CACHE_TTL
    });

    return data;
  } catch (error) {
    console.error('[PlanGuard] Failed to fetch tenant data:', error);
    throw new Error('Failed to verify tenant plan');
  }
}

/**
 * Check if tenant has a specific feature
 */
export function requireFeature(...requiredFeatures: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || req.params.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required',
          code: 'TENANT_ID_REQUIRED'
        });
      }

      const tenant = await getTenantData(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        });
      }

      // Check tenant status
      if (tenant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Tenant account is suspended',
          code: 'TENANT_SUSPENDED'
        });
      }

      const tenantFeatures = tenant.subscription?.features || [];

      // Check if tenant has all required features
      const missingFeatures = requiredFeatures.filter(f => !tenantFeatures.includes(f));

      if (missingFeatures.length > 0) {
        return res.status(403).json({
          success: false,
          message: `This feature requires an Enterprise plan. Missing features: ${missingFeatures.join(', ')}`,
          code: 'PLAN_FEATURE_REQUIRED',
          requiredFeatures: missingFeatures,
          currentPlan: tenant.subscription?.plan || 'free',
          upgradeRequired: true
        });
      }

      // Attach tenant data to request for downstream use
      (req as any).tenant = tenant;
      next();
    } catch (error: any) {
      console.error('[PlanGuard] Error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify tenant plan',
        code: 'PLAN_VERIFICATION_FAILED'
      });
    }
  };
}

/**
 * Check if tenant is on enterprise plan
 */
export function requireEnterprisePlan() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || req.params.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required',
          code: 'TENANT_ID_REQUIRED'
        });
      }

      const tenant = await getTenantData(tenantId);

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND'
        });
      }

      if (tenant.subscription?.plan !== 'enterprise') {
        return res.status(403).json({
          success: false,
          message: 'This feature is only available for Enterprise plan subscribers',
          code: 'ENTERPRISE_PLAN_REQUIRED',
          currentPlan: tenant.subscription?.plan || 'free',
          upgradeRequired: true
        });
      }

      (req as any).tenant = tenant;
      next();
    } catch (error: any) {
      console.error('[PlanGuard] Error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify tenant plan',
        code: 'PLAN_VERIFICATION_FAILED'
      });
    }
  };
}

/**
 * Middleware for taxation features
 */
export const requireTaxationFeature = requireFeature('taxation');

/**
 * Middleware for tax declaration features
 */
export const requireTaxDeclarationFeature = requireFeature('tax_declarations');

/**
 * Middleware for advance tax features
 */
export const requireAdvanceTaxFeature = requireFeature('advance_tax');

/**
 * Middleware for PF management
 */
export const requirePFManagement = requireFeature('pf_management');

/**
 * Middleware for ESI management
 */
export const requireESIManagement = requireFeature('esi_management');

/**
 * Middleware for statutory compliance
 */
export const requireStatutoryCompliance = requireFeature('statutory_compliance');

/**
 * Middleware for auditor access
 */
export const requireAuditorAccess = requireFeature('auditor_access');

/**
 * Clear cache for a tenant (useful when plan changes)
 */
export function clearTenantCache(tenantId: string): void {
  tenantCache.delete(tenantId);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  tenantCache.clear();
}

export default {
  requireFeature,
  requireEnterprisePlan,
  requireTaxationFeature,
  requireTaxDeclarationFeature,
  requireAdvanceTaxFeature,
  requirePFManagement,
  requireESIManagement,
  requireStatutoryCompliance,
  requireAuditorAccess,
  clearTenantCache,
  clearAllCache
};
