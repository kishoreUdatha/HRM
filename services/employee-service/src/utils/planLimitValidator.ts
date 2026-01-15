import axios from 'axios';
import mongoose from 'mongoose';
import Employee from '../models/Employee';

interface TenantSubscription {
  plan: string;
  maxEmployees: number;
  maxAdmins: number;
}

interface TenantData {
  subscription: TenantSubscription;
}

interface PlanLimits {
  maxEmployees: number;
  maxAdmins: number;
  maxStorage: number;
  maxApiCalls: number;
}

/**
 * Fetch tenant's current plan from tenant service
 */
async function getTenantPlan(tenantId: string): Promise<string | null> {
  try {
    const tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3002';
    const internalApiKey = process.env.INTERNAL_API_KEY;

    if (!internalApiKey) {
      console.error('[PlanLimitValidator] INTERNAL_API_KEY not configured');
      return null;
    }

    const response = await axios.get(`${tenantServiceUrl}/internal/${tenantId}`, {
      headers: {
        'x-internal-api-key': internalApiKey,
        'x-tenant-id': tenantId,
      },
    });

    const tenant: TenantData = response.data.data || response.data;
    return tenant.subscription?.plan || 'free';
  } catch (error) {
    console.error('[PlanLimitValidator] Failed to fetch tenant plan:', error);
    return null;
  }
}

/**
 * Fetch plan limits from billing service (dynamic from database)
 */
async function getPlanLimits(planCode: string): Promise<PlanLimits | null> {
  try {
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:3027';
    // Use public plans endpoint instead of admin endpoint (no auth required)
    const response = await axios.get(`${billingServiceUrl}/api/billing/plans`);

    const plans = response.data.data;
    const plan = plans.find((p: any) => p.planCode === planCode);

    if (!plan) {
      console.error(`[PlanLimitValidator] Plan '${planCode}' not found in billing service`);
      return null;
    }

    return plan.limits;
  } catch (error) {
    console.error('[PlanLimitValidator] Failed to fetch plan limits from database:', error);
    // Fallback to basic limits if service is down
    return { maxEmployees: 10, maxAdmins: 1, maxStorage: 1024, maxApiCalls: 10000 };
  }
}

/**
 * Check if tenant can add more employees based on their plan (dynamic from database)
 */
export async function canAddEmployee(tenantId: string): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  try {
    // Fetch tenant's current plan
    const planCode = await getTenantPlan(tenantId);
    if (!planCode) {
      console.error('[PlanLimitValidator] Could not fetch tenant plan - BLOCKING employee creation');
      return {
        allowed: false,
        message: 'Unable to verify tenant plan. Please try again or contact support.'
      };
    }

    // Fetch plan limits from billing service database
    const planLimits = await getPlanLimits(planCode);
    if (!planLimits) {
      console.error('[PlanLimitValidator] Could not fetch plan limits - BLOCKING employee creation');
      return {
        allowed: false,
        message: 'Unable to fetch plan limits from billing service. Please try again or contact support.'
      };
    }

    // Count current employees for this tenant
    const currentEmployeeCount = await Employee.countDocuments({ tenantId: new mongoose.Types.ObjectId(tenantId) });

    // Check if limit is exceeded
    const limit = planLimits.maxEmployees;

    // Enterprise plan has unlimited employees (represented as -1 or very high number)
    if (limit === -1 || limit >= 10000) {
      return { allowed: true, currentCount: currentEmployeeCount, limit };
    }

    if (currentEmployeeCount >= limit) {
      return {
        allowed: false,
        message: `Employee limit exceeded. Your ${planCode} plan allows maximum ${limit} employees. You currently have ${currentEmployeeCount} employees. Please upgrade your plan to add more.`,
        currentCount: currentEmployeeCount,
        limit,
      };
    }

    return { allowed: true, currentCount: currentEmployeeCount, limit };
  } catch (error) {
    console.error('[PlanLimitValidator] Error checking employee limit:', error);
    // In case of error, BLOCK creation for security
    return {
      allowed: false,
      message: `Unable to verify plan limits. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`
    };
  }
}

/**
 * Validate employee limit before creation - throws error if limit exceeded
 */
export async function validateEmployeeLimit(tenantId: string): Promise<void> {
  const check = await canAddEmployee(tenantId);
  if (!check.allowed) {
    throw new Error(check.message);
  }
}
