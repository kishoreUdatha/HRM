import axios from 'axios';
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
    const response = await axios.get(`${tenantServiceUrl}/api/tenants/${tenantId}`, {
      headers: {
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
    const response = await axios.get(`${billingServiceUrl}/api/billing/admin/plans/${planCode}`);

    const plan = response.data.data;
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
      console.warn('[PlanLimitValidator] Could not fetch tenant plan, allowing employee creation');
      return { allowed: true };
    }

    // Fetch plan limits from billing service database
    const planLimits = await getPlanLimits(planCode);
    if (!planLimits) {
      console.warn('[PlanLimitValidator] Could not fetch plan limits, allowing employee creation');
      return { allowed: true };
    }

    // Count current employees for this tenant
    const currentEmployeeCount = await Employee.countDocuments({ tenantId });

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
    // In case of error, allow creation but log it
    return { allowed: true };
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
