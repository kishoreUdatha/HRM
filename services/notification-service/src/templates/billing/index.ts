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
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    amount: number;
  }>;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  paymentMethod?: string;
}

// Beautiful email styles matching website theme (HRZi brand colors)
const baseStyles = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background: #f8fafc;
    }
    .email-wrapper { background: #f8fafc; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); }
    .header {
      background: linear-gradient(135deg, #00d4ff 0%, #0066ff 25%, #4f46e5 50%, #8b5cf6 75%, #d946ef 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 10px 0 0; opacity: 0.95; font-size: 16px; }
    .content { padding: 40px 30px; }
    .content p { margin-bottom: 16px; color: #475569; font-size: 15px; }
    .footer {
      background: #f1f5f9;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { font-size: 13px; color: #64748b; margin: 8px 0; }
    .footer a { color: #4f46e5; text-decoration: none; }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #0066ff 0%, #4f46e5 50%, #8b5cf6 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4); }
    .btn-secondary { background: #64748b; box-shadow: 0 4px 15px rgba(100, 116, 139, 0.2); }
    .card {
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
    }
    .invoice-box {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #fae8ff 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 24px 0;
      border: 2px solid #c7d2fe;
    }
    .amount-large {
      font-size: 48px;
      font-weight: 800;
      background: linear-gradient(135deg, #0066ff 0%, #4f46e5 50%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 10px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin: 10px 0;
    }
    .status-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .status-warning { background: #fff3cd; color: #856404; border: 1px solid #ffc107; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    td:last-child { text-align: right; }
    .label { color: #64748b; font-size: 14px; font-weight: 500; }
    .value { font-weight: 600; color: #1e293b; font-size: 15px; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, #cbd5e1, transparent); margin: 24px 0; }
    ul { padding-left: 20px; margin: 16px 0; }
    li { margin: 8px 0; color: #475569; }
    .highlight-box {
      background: linear-gradient(135deg, #00d4ff20 0%, #4f46e520 100%);
      border-left: 4px solid #4f46e5;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    }
  </style>
`;

export const paymentSuccessTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `🎉 Payment Successful - ${data.planName} Plan Activated`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Your subscription has been activated</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Thank you for your payment! We're excited to have you on the <strong>${data.planName}</strong> plan. Your subscription is now active and all premium features are available.</p>

            <div class="invoice-box">
              <div style="text-align: center;">
                <span class="status-badge status-success">✓ Payment Confirmed</span>
              </div>
              <div class="amount-large" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #64748b; margin: 0;">Total Amount Paid</p>
            </div>

            <div class="card">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">📄 Invoice Details</h3>
              <table>
                <tr>
                  <td class="label">Invoice Number</td>
                  <td class="value">${data.invoiceNumber || 'Generating...'}</td>
                </tr>
                <tr>
                  <td class="label">Payment Date</td>
                  <td class="value">${data.paymentDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td class="label">Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? 'Annual (Save 17%)' : 'Monthly'}</td>
                </tr>
                ${data.billingPeriodStart && data.billingPeriodEnd ? `
                <tr>
                  <td class="label">Service Period</td>
                  <td class="value">${new Date(data.billingPeriodStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date(data.billingPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                </tr>
                ` : ''}
                <tr>
                  <td class="label">Payment Method</td>
                  <td class="value">${data.paymentMethod || 'Card/UPI'}</td>
                </tr>
              </table>

              ${data.lineItems && data.lineItems.length > 0 ? `
                <div class="divider"></div>
                <h4 style="margin: 16px 0 12px 0; color: #1e293b; font-size: 14px;">Line Items</h4>
                <table style="margin: 0;">
                  ${data.lineItems.map(item => `
                    <tr>
                      <td class="label">${item.description} × ${item.quantity}</td>
                      <td class="value">${data.currency} ${item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing?tab=invoices&invoice=${data.invoiceNumber}" class="btn">View Invoice</a>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; font-weight: 600; color: #1e293b;">🚀 What's Next?</p>
              <p style="margin: 8px 0 0 0;">You now have access to all ${data.planName} features. Your next billing date is ${data.expiryDate || new Date(Date.now() + (data.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            </div>

            <p>If you have any questions or need assistance, our support team is always here to help!</p>

            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">This is an automated receipt for your records. Please save this email for your reference.</p>
          </div>
          <div class="footer">
            <p style="font-weight: 600; color: #1e293b; margin-bottom: 12px;">HRM Platform</p>
            <p>Modern Human Resource Management System</p>
            <p>Need help? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRM Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const paymentFailedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `❌ Payment Failed - Action Required for ${data.planName} Plan`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
            <div class="icon">✗</div>
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>We were unable to process your payment for the <strong>${data.planName}</strong> subscription. Don't worry, your current access remains active while we resolve this.</p>

            <div class="card" style="background: #fef2f2; border: 2px solid #fecaca;">
              <div style="text-align: center;">
                <span class="status-badge status-danger">✗ Payment Unsuccessful</span>
              </div>
              <table>
                <tr>
                  <td class="label">Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Amount Due</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
                </tr>
                <tr>
                  <td class="label">Attempt Date</td>
                  <td class="value">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn">Update Payment Method</a>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; font-weight: 600; color: #1e293b;">💡 Common Reasons for Payment Failure:</p>
              <ul style="margin: 12px 0 0 0;">
                <li>Insufficient funds in your account</li>
                <li>Card expired or incorrect details</li>
                <li>Payment declined by your bank</li>
                <li>International transactions blocked</li>
              </ul>
            </div>

            <p><strong>What Happens Next?</strong></p>
            <ul>
              <li>We'll automatically retry the payment in 24 hours</li>
              <li>You can manually retry payment anytime from your billing page</li>
              <li>Your access will continue during this period</li>
            </ul>

            <p>If you continue to experience issues, please contact your bank or try a different payment method. Our support team is ready to assist you!</p>
          </div>
          <div class="footer">
            <p style="font-weight: 600; color: #1e293b; margin-bottom: 12px;">HRM Platform</p>
            <p>Need immediate help? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRM Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const invoiceGeneratedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `📄 Invoice ${data.invoiceNumber} - ${data.planName} Plan`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="icon">📄</div>
            <h1>New Invoice Generated</h1>
            <p>Your invoice is ready</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>A new invoice has been generated for your <strong>${data.planName}</strong> subscription.</p>

            <div class="invoice-box">
              <h2 style="margin: 0 0 20px 0; text-align: center; color: #1e293b;">Invoice #${data.invoiceNumber}</h2>
              <table>
                <tr>
                  <td class="label">Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
                </tr>
                <tr>
                  <td class="label">Date</td>
                  <td class="value">${data.paymentDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing?tab=invoices&invoice=${data.invoiceNumber}" class="btn">View Invoice</a>
            </div>

            <p>Thank you for choosing HRM Platform for your human resource management needs.</p>
          </div>
          <div class="footer">
            <p style="font-weight: 600; color: #1e293b; margin-bottom: 12px;">HRM Platform</p>
            <p>Questions? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRM Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

// Placeholder templates for future use
export const subscriptionActivatedTemplate = (data: BillingEmailData) => paymentSuccessTemplate(data);
export const planExpiringTemplate = (data: BillingEmailData) => paymentFailedTemplate(data);
export const planExpiredTemplate = (data: BillingEmailData) => paymentFailedTemplate(data);
export const subscriptionCancelledTemplate = (data: BillingEmailData) => invoiceGeneratedTemplate(data);

export const billingTemplates = {
  PAYMENT_SUCCESS: paymentSuccessTemplate,
  PAYMENT_FAILED: paymentFailedTemplate,
  INVOICE_GENERATED: invoiceGeneratedTemplate,
};
