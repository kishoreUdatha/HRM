interface TenantBillingInfo {
  tenantId: string;
  name: string;
  billingEmail: string;
  plan: string;
  billingCycle: 'monthly' | 'yearly';
}

class TenantClient {
  private baseUrl: string;
  private internalApiKey: string;

  constructor() {
    this.baseUrl = process.env.TENANT_SERVICE_URL || 'http://tenant-service:3001';
    this.internalApiKey = process.env.INTERNAL_API_KEY || 'dev-secret-token-12345';
  }

  async getTenantBillingInfo(tenantId: string): Promise<TenantBillingInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/internal/${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey,
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
