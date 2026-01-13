interface TenantBillingInfo {
  tenantId: string;
  name: string;
  billingEmail: string;
  plan: string;
  billingCycle: 'monthly' | 'yearly';
}

class TenantClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.TENANT_SERVICE_URL || 'http://localhost:3021/api/tenants';
  }

  async getTenantBillingInfo(tenantId: string): Promise<TenantBillingInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
      });

      if (!response.ok) {
        console.error(`[TenantClient] Failed to fetch tenant ${tenantId}: ${response.status}`);
        return null;
      }

      const result = await response.json() as { data?: any } | any;
      const tenant = (result as { data?: any }).data || result;

      return {
        tenantId: tenant._id || tenantId,
        name: tenant.name || 'Valued Customer',
        billingEmail: tenant.billing?.email || tenant.email || '',
        plan: tenant.subscription?.plan || 'free',
        billingCycle: tenant.subscription?.billingCycle || 'monthly',
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[TenantClient] Error fetching tenant ${tenantId}:`, err.message);
      return null;
    }
  }
}

export default new TenantClient();
