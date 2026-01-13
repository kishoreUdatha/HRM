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

/**
 * Fetch tenant subscription limits from tenant service
 */
async function getTenantLimits(tenantId: string): Promise<TenantSubscription | null> {
  try {
    const tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3002';
    const response = await axios.get(`${tenantServiceUrl}/api/tenants/${tenantId}`, {
      headers: {
        'x-tenant-id': tenantId,
      },
    });

    const tenant: TenantData = response.data.data || response.data;
    return tenant.subscription;
  } catch (error) {
    console.error('[PlanLimitValidator] Failed to fetch tenant limits:', error);
    return null;
  }
}

/**
 * Check if tenant can add more employees based on their plan
 */
export async function canAddEmployee(tenantId: string): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  try {
    // Fetch tenant limits
    const subscription = await getTenantLimits(tenantId);
    if (!subscription) {
      console.warn('[PlanLimitValidator] Could not fetch tenant limits, allowing employee creation');
      return { allowed: true };
    }

    // Count current employees for this tenant
    const currentEmployeeCount = await Employee.countDocuments({ tenantId });

    // Check if limit is exceeded
    const limit = subscription.maxEmployees;

    // Enterprise plan has unlimited employees (represented as -1 or very high number)
    if (limit === -1 || limit >= 10000) {
      return { allowed: true, currentCount: currentEmployeeCount, limit };
    }

    if (currentEmployeeCount >= limit) {
      return {
        allowed: false,
        message: `Employee limit exceeded. Your ${subscription.plan} plan allows maximum ${limit} employees. You currently have ${currentEmployeeCount} employees. Please upgrade your plan to add more.`,
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
