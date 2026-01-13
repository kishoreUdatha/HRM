import resendService, { SendEmailResult } from './resendService';
import {
  BillingEmailData,
  paymentSuccessTemplate,
  paymentFailedTemplate,
  invoiceGeneratedTemplate,
  subscriptionActivatedTemplate,
  planExpiringTemplate,
  planExpiredTemplate,
  subscriptionCancelledTemplate,
} from '../templates/billing';

class BillingNotificationService {
  private dashboardUrl: string;
  private supportEmail: string;

  constructor() {
    this.dashboardUrl = process.env.DASHBOARD_URL || 'https://app.hrzio.com';
    this.supportEmail = process.env.SUPPORT_EMAIL || 'support@hrzio.com';
  }

  private enrichData(data: Partial<BillingEmailData>): BillingEmailData {
    return {
      tenantName: data.tenantName || 'Valued Customer',
      tenantEmail: data.tenantEmail || '',
      planName: data.planName || 'Unknown',
      amount: data.amount || 0,
      currency: data.currency || 'INR',
      billingCycle: data.billingCycle || 'monthly',
      invoiceNumber: data.invoiceNumber,
      invoiceUrl: data.invoiceUrl,
      paymentDate: data.paymentDate,
      expiryDate: data.expiryDate,
      daysUntilExpiry: data.daysUntilExpiry,
      dashboardUrl: this.dashboardUrl,
      supportEmail: this.supportEmail,
    };
  }

  async sendPaymentSuccess(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = paymentSuccessTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'PAYMENT_SUCCESS',
    });
  }

  async sendPaymentFailed(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = paymentFailedTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'PAYMENT_FAILED',
    });
  }

  async sendInvoiceGenerated(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = invoiceGeneratedTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'INVOICE_GENERATED',
    });
  }

  async sendSubscriptionActivated(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = subscriptionActivatedTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'SUBSCRIPTION_ACTIVATED',
    });
  }

  async sendPlanExpiring(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = planExpiringTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'PLAN_EXPIRING',
    });
  }

  async sendPlanExpired(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = planExpiredTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'PLAN_EXPIRED',
    });
  }

  async sendSubscriptionCancelled(tenantId: string, email: string, data: Partial<BillingEmailData>): Promise<SendEmailResult> {
    const enrichedData = this.enrichData(data);
    const template = subscriptionCancelledTemplate(enrichedData);

    return resendService.sendEmail({
      tenantId,
      to: email,
      subject: template.subject,
      html: template.html,
      templateCode: 'SUBSCRIPTION_CANCELLED',
    });
  }
}

export default new BillingNotificationService();
