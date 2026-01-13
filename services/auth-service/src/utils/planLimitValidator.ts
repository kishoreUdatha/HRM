import axios from 'axios';
import User from '../models/User';

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
 * Check if tenant can add more admin users based on their plan (dynamic from database)
 */
export async function canAddAdmin(tenantId: string): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  try {
    // Fetch tenant's current plan
    const planCode = await getTenantPlan(tenantId);
    if (!planCode) {
      console.warn('[PlanLimitValidator] Could not fetch tenant plan, allowing admin creation');
      return { allowed: true };
    }

    // Fetch plan limits from billing service database
    const planLimits = await getPlanLimits(planCode);
    if (!planLimits) {
      console.warn('[PlanLimitValidator] Could not fetch plan limits, allowing admin creation');
      return { allowed: true };
    }

    // Count current admin users for this tenant
    const currentAdminCount = await User.countDocuments({
      tenantId,
      role: { $in: ['admin', 'owner'] }, // Count both admin and owner roles
    });

    // Check if limit is exceeded
    const limit = planLimits.maxAdmins;

    // Enterprise plan has high admin limit
    if (limit === -1 || limit >= 1000) {
      return { allowed: true, currentCount: currentAdminCount, limit };
    }

    if (currentAdminCount >= limit) {
      return {
        allowed: false,
        message: `Admin user limit exceeded. Your ${planCode} plan allows maximum ${limit} admin user(s). You currently have ${currentAdminCount} admin(s). Please upgrade your plan to add more administrators.`,
        currentCount: currentAdminCount,
        limit,
      };
    }

    return { allowed: true, currentCount: currentAdminCount, limit };
  } catch (error) {
    console.error('[PlanLimitValidator] Error checking admin limit:', error);
    // In case of error, allow creation but log it
    return { allowed: true };
  }
}

/**
 * Check if tenant can add more users (any role) based on employee limit (dynamic from database)
 * This is a secondary check - employees are managed in employee-service,
 * but users in auth-service can also count toward employee limit
 */
export async function canAddUser(tenantId: string): Promise<{ allowed: boolean; message?: string; currentCount?: number; limit?: number }> {
  try {
    // Fetch tenant's current plan
    const planCode = await getTenantPlan(tenantId);
    if (!planCode) {
      console.warn('[PlanLimitValidator] Could not fetch tenant plan, allowing user creation');
      return { allowed: true };
    }

    // Fetch plan limits from billing service database
    const planLimits = await getPlanLimits(planCode);
    if (!planLimits) {
      console.warn('[PlanLimitValidator] Could not fetch plan limits, allowing user creation');
      return { allowed: true };
    }

    // Count current users for this tenant (all roles)
    const currentUserCount = await User.countDocuments({ tenantId });

    // Check if limit is exceeded
    const limit = planLimits.maxEmployees;

    // Enterprise plan has unlimited users
    if (limit === -1 || limit >= 10000) {
      return { allowed: true, currentCount: currentUserCount, limit };
    }

    if (currentUserCount >= limit) {
      return {
        allowed: false,
        message: `User limit exceeded. Your ${planCode} plan allows maximum ${limit} users. You currently have ${currentUserCount} users. Please upgrade your plan to add more.`,
        currentCount: currentUserCount,
        limit,
      };
    }

    return { allowed: true, currentCount: currentUserCount, limit };
  } catch (error) {
    console.error('[PlanLimitValidator] Error checking user limit:', error);
    // In case of error, allow creation but log it
    return { allowed: true };
  }
}

/**
 * Validate admin limit before creation - throws error if limit exceeded
 */
export async function validateAdminLimit(tenantId: string): Promise<void> {
  const check = await canAddAdmin(tenantId);
  if (!check.allowed) {
    throw new Error(check.message);
  }
}

/**
 * Validate user limit before creation - throws error if limit exceeded
 */
export async function validateUserLimit(tenantId: string): Promise<void> {
  const check = await canAddUser(tenantId);
  if (!check.allowed) {
    throw new Error(check.message);
  }
}
