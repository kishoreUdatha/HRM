export interface BillingEmailData {
  tenantName: string;
  tenantEmail: string;
  planName: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  invoiceNumber?: string;
  invoiceUrl?: string;
  paymentDate?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  dashboardUrl?: string;
  supportEmail?: string;
}

const baseStyles = `
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 15px 0; }
    .btn-secondary { background: #6c757d; }
    .highlight { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .amount { font-size: 32px; font-weight: 700; color: #667eea; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; }
    .danger { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    .label { color: #666; font-size: 14px; }
    .value { font-weight: 600; text-align: right; }
  </style>
`;

export const paymentSuccessTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Payment Received - ${data.planName} Plan`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Successful</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>Thank you for your payment! Your subscription has been successfully renewed.</p>

          <div class="highlight">
            <div class="success">
              <strong>Payment Confirmed</strong>
            </div>
            <table style="margin-top: 15px;">
              <tr>
                <td class="label">Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Amount</td>
                <td class="value"><span class="amount">${data.currency} ${data.amount.toLocaleString()}</span></td>
              </tr>
              <tr>
                <td class="label">Billing Cycle</td>
                <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
              </tr>
              <tr>
                <td class="label">Invoice Number</td>
                <td class="value">${data.invoiceNumber || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Payment Date</td>
                <td class="value">${data.paymentDate || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          ${data.invoiceUrl ? `<p style="text-align: center;"><a href="${data.invoiceUrl}" class="btn">Download Invoice</a></p>` : ''}

          <p>If you have any questions about your subscription, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const paymentFailedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Action Required: Payment Failed - ${data.planName} Plan`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h1>Payment Failed</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>We were unable to process your payment for your ${data.planName} subscription.</p>

          <div class="highlight">
            <div class="danger">
              <strong>Payment Unsuccessful</strong>
              <p style="margin: 10px 0 0 0;">Please update your payment method to avoid service interruption.</p>
            </div>
            <table style="margin-top: 15px;">
              <tr>
                <td class="label">Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Amount Due</td>
                <td class="value">${data.currency} ${data.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">Billing Cycle</td>
                <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
              </tr>
            </table>
          </div>

          <p style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn">Update Payment Method</a>
          </p>

          <p><strong>Common reasons for payment failure:</strong></p>
          <ul>
            <li>Insufficient funds in your account</li>
            <li>Expired card details</li>
            <li>Bank declined the transaction</li>
          </ul>

          <p>We'll automatically retry the payment in 24 hours. If you need assistance, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const invoiceGeneratedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Invoice ${data.invoiceNumber} - ${data.planName} Plan`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Invoice</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>A new invoice has been generated for your ${data.planName} subscription.</p>

          <div class="highlight">
            <table>
              <tr>
                <td class="label">Invoice Number</td>
                <td class="value">${data.invoiceNumber}</td>
              </tr>
              <tr>
                <td class="label">Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Amount</td>
                <td class="value"><span class="amount">${data.currency} ${data.amount.toLocaleString()}</span></td>
              </tr>
              <tr>
                <td class="label">Billing Cycle</td>
                <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
              </tr>
              <tr>
                <td class="label">Date</td>
                <td class="value">${data.paymentDate || new Date().toLocaleDateString()}</td>
              </tr>
            </table>
          </div>

          ${data.invoiceUrl ? `<p style="text-align: center;"><a href="${data.invoiceUrl}" class="btn">Download Invoice</a></p>` : ''}

          <p>Thank you for choosing HRZIO for your HR management needs.</p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const subscriptionActivatedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Welcome to ${data.planName} Plan - Your Subscription is Active!`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Subscription Activated</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>Great news! Your ${data.planName} subscription is now active. You have full access to all the features included in your plan.</p>

          <div class="highlight">
            <div class="success">
              <strong>Your subscription is now active!</strong>
            </div>
            <table style="margin-top: 15px;">
              <tr>
                <td class="label">Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Amount</td>
                <td class="value">${data.currency} ${data.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">Billing Cycle</td>
                <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
              </tr>
              <tr>
                <td class="label">Next Billing Date</td>
                <td class="value">${data.expiryDate || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <p style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://hrzio.com'}" class="btn">Go to Dashboard</a>
          </p>

          <p><strong>What's included in your ${data.planName} plan:</strong></p>
          <ul>
            ${data.planName === 'Starter' ? `
              <li>Up to 50 employees</li>
              <li>Attendance & Leave management</li>
              <li>Basic payroll features</li>
              <li>Reports & Analytics</li>
            ` : ''}
            ${data.planName === 'Professional' ? `
              <li>Up to 200 employees</li>
              <li>All Starter features</li>
              <li>Recruitment management</li>
              <li>API access</li>
            ` : ''}
            ${data.planName === 'Enterprise' ? `
              <li>Unlimited employees</li>
              <li>All Professional features</li>
              <li>SSO integration</li>
              <li>Custom integrations</li>
              <li>Priority support</li>
            ` : ''}
          </ul>

          <p>If you have any questions, our support team is here to help!</p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const planExpiringTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `${data.daysUntilExpiry === 0 ? 'URGENT' : 'Reminder'}: Your ${data.planName} Plan ${data.daysUntilExpiry === 0 ? 'Expires Today' : `Expires in ${data.daysUntilExpiry} Days`}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, ${data.daysUntilExpiry && data.daysUntilExpiry <= 3 ? '#dc3545 0%, #c82333' : '#ffc107 0%, #e0a800'} 100%);">
          <h1>Subscription Expiring ${data.daysUntilExpiry === 0 ? 'Today' : 'Soon'}</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>Your ${data.planName} subscription is ${data.daysUntilExpiry === 0 ? 'expiring today' : `expiring in ${data.daysUntilExpiry} days`}.</p>

          <div class="highlight">
            <div class="${data.daysUntilExpiry && data.daysUntilExpiry <= 3 ? 'danger' : 'warning'}">
              <strong>${data.daysUntilExpiry === 0 ? 'Expires Today!' : `${data.daysUntilExpiry} Days Remaining`}</strong>
              <p style="margin: 10px 0 0 0;">Renew now to avoid service interruption.</p>
            </div>
            <table style="margin-top: 15px;">
              <tr>
                <td class="label">Current Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Expiry Date</td>
                <td class="value">${data.expiryDate}</td>
              </tr>
              <tr>
                <td class="label">Renewal Amount</td>
                <td class="value">${data.currency} ${data.amount.toLocaleString()}/${data.billingCycle === 'yearly' ? 'year' : 'month'}</td>
              </tr>
            </table>
          </div>

          <p style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn">Renew Now</a>
          </p>

          <p><strong>What happens if you don't renew?</strong></p>
          <ul>
            <li>Your team will lose access to premium features</li>
            <li>Data will be retained for 30 days</li>
            <li>You'll be downgraded to the Free plan</li>
          </ul>

          <p><strong>Looking for a better plan?</strong> Upgrade to unlock more features and higher limits.</p>
          <p style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-secondary">View Upgrade Options</a>
          </p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const planExpiredTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Your ${data.planName} Plan Has Expired - Reactivate Now`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h1>Subscription Expired</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>Your ${data.planName} subscription has expired. Your account has been downgraded to the Free plan.</p>

          <div class="highlight">
            <div class="danger">
              <strong>Subscription Expired</strong>
              <p style="margin: 10px 0 0 0;">Reactivate now to regain access to all your premium features.</p>
            </div>
            <table style="margin-top: 15px;">
              <tr>
                <td class="label">Previous Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Expired On</td>
                <td class="value">${data.expiryDate}</td>
              </tr>
              <tr>
                <td class="label">Current Plan</td>
                <td class="value">Free</td>
              </tr>
            </table>
          </div>

          <p style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn">Reactivate Subscription</a>
          </p>

          <p><strong>What you're missing:</strong></p>
          <ul>
            <li>Access to premium features</li>
            <li>Higher employee limits</li>
            <li>Advanced reporting</li>
            <li>Priority support</li>
          </ul>

          <p><strong>Important:</strong> Your data will be retained for 30 days. After that, data exceeding the Free plan limits may be archived.</p>

          <p>Need help? Our team is ready to assist you with reactivation or answer any questions.</p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const subscriptionCancelledTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Subscription Cancelled - ${data.planName} Plan`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%);">
          <h1>Subscription Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.tenantName},</p>
          <p>We're sorry to see you go. Your ${data.planName} subscription has been cancelled.</p>

          <div class="highlight">
            <table>
              <tr>
                <td class="label">Plan</td>
                <td class="value">${data.planName}</td>
              </tr>
              <tr>
                <td class="label">Access Until</td>
                <td class="value">${data.expiryDate}</td>
              </tr>
              <tr>
                <td class="label">Status</td>
                <td class="value">Cancelled</td>
              </tr>
            </table>
          </div>

          <p><strong>What happens next:</strong></p>
          <ul>
            <li>You'll retain access until ${data.expiryDate}</li>
            <li>After that, your account will switch to the Free plan</li>
            <li>Your data will be retained for 30 days</li>
          </ul>

          <p>Changed your mind? You can reactivate your subscription anytime before the end of your current billing period.</p>

          <p style="text-align: center;">
            <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn">Reactivate Subscription</a>
          </p>

          <p>We'd love to hear your feedback. If there's anything we could have done better, please let us know.</p>
        </div>
        <div class="footer">
          <p>HRZIO - Human Resource Management</p>
          <p>Questions? Contact us at ${data.supportEmail || 'support@hrzio.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const billingTemplates = {
  PAYMENT_SUCCESS: paymentSuccessTemplate,
  PAYMENT_FAILED: paymentFailedTemplate,
  INVOICE_GENERATED: invoiceGeneratedTemplate,
  SUBSCRIPTION_ACTIVATED: subscriptionActivatedTemplate,
  PLAN_EXPIRING: planExpiringTemplate,
  PLAN_EXPIRED: planExpiredTemplate,
  SUBSCRIPTION_CANCELLED: subscriptionCancelledTemplate,
};
