interface BillingEmailData {
  email: string;
  tenantName: string;
  planName: string;
  amount?: number;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly';
  invoiceNumber?: string;
  invoiceUrl?: string;
  paymentDate?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
}

class NotificationClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3025/api/notifications';
  }

  private async sendRequest(endpoint: string, tenantId: string, data: BillingEmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json() as { message?: string };

      if (!response.ok) {
        console.error(`[NotificationClient] Failed to send ${endpoint}:`, result);
        return { success: false, error: result.message || 'Request failed' };
      }

      console.log(`[NotificationClient] Successfully sent ${endpoint} to ${data.email}`);
      return { success: true };
    } catch (error) {
      const err = error as Error;
      console.error(`[NotificationClient] Error sending ${endpoint}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  async sendPaymentSuccess(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/payment-success', tenantId, data);
  }

  async sendPaymentFailed(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/payment-failed', tenantId, data);
  }

  async sendInvoiceGenerated(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/invoice-generated', tenantId, data);
  }

  async sendSubscriptionActivated(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/subscription-activated', tenantId, data);
  }

  async sendPlanExpiring(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/plan-expiring', tenantId, data);
  }

  async sendPlanExpired(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/plan-expired', tenantId, data);
  }

  async sendSubscriptionCancelled(tenantId: string, data: BillingEmailData) {
    return this.sendRequest('/billing/subscription-cancelled', tenantId, data);
  }
}

export default new NotificationClient();
