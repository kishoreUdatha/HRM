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

// HRZio Brand Colors
// Primary: #4f46e5 (Indigo) - Main brand color
// Secondary: #8b5cf6 (Violet) - Accent color
// Accent: #00d4ff (Cyan) - Highlight color
// Success: #10b981 (Emerald) - Success states
// Warning: #f59e0b (Amber) - Warning states
// Danger: #ef4444 (Red) - Error/danger states

// Beautiful email styles matching HRZio website theme
const baseStyles = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background: #f8fafc;
    }
    .email-wrapper { background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%); padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(79, 70, 229, 0.15); }
    .header {
      background: linear-gradient(135deg, #00d4ff 0%, #0066ff 25%, #4f46e5 50%, #8b5cf6 75%, #d946ef 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    }
    .header-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%);
    }
    .header-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
    }
    .header-info {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
    }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header p { margin: 10px 0 0; opacity: 0.95; font-size: 16px; }
    .logo { font-size: 32px; font-weight: 800; margin-bottom: 20px; letter-spacing: -1px; }
    .logo span { color: #00d4ff; }
    .content { padding: 40px 30px; }
    .content p { margin-bottom: 16px; color: #475569; font-size: 15px; }
    .footer {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p { font-size: 13px; color: #64748b; margin: 8px 0; }
    .footer a { color: #4f46e5; text-decoration: none; font-weight: 500; }
    .footer-logo { font-size: 20px; font-weight: 700; color: #4f46e5; margin-bottom: 12px; }
    .footer-logo span { color: #8b5cf6; }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
    }
    .btn-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); }
    .btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); }
    .btn-secondary { background: linear-gradient(135deg, #64748b 0%, #475569 100%); box-shadow: 0 4px 15px rgba(100, 116, 139, 0.3); }
    .card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
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
    .success-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 24px 0;
      border: 2px solid #6ee7b7;
    }
    .warning-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 24px 0;
      border: 2px solid #fcd34d;
    }
    .danger-box {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 24px 0;
      border: 2px solid #fca5a5;
    }
    .amount-large {
      font-size: 48px;
      font-weight: 800;
      background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 10px 0;
    }
    .amount-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .amount-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .amount-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin: 10px 0;
    }
    .status-success { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; border: 1px solid #6ee7b7; }
    .status-danger { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b; border: 1px solid #fca5a5; }
    .status-warning { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border: 1px solid #fcd34d; }
    .status-info { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; border: 1px solid #93c5fd; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    td:last-child { text-align: right; }
    .label { color: #64748b; font-size: 14px; font-weight: 500; }
    .value { font-weight: 600; color: #1e293b; font-size: 15px; }
    .divider { height: 2px; background: linear-gradient(90deg, #4f46e5, #8b5cf6, #d946ef); margin: 24px 0; border-radius: 1px; }
    ul { padding-left: 20px; margin: 16px 0; }
    li { margin: 8px 0; color: #475569; }
    .highlight-box {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border-left: 4px solid #4f46e5;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .highlight-success {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left-color: #10b981;
    }
    .highlight-warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left-color: #f59e0b;
    }
    .highlight-danger {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border-left-color: #ef4444;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.3);
    }
    .countdown-box {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .countdown-number {
      font-size: 56px;
      font-weight: 800;
      color: #f59e0b;
      line-height: 1;
    }
    .countdown-label {
      color: #94a3b8;
      font-size: 14px;
      margin-top: 8px;
    }
    .feature-list {
      list-style: none;
      padding: 0;
    }
    .feature-list li {
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
    }
    .feature-list li:last-child { border-bottom: none; }
    .feature-icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    }
  </style>
`;

export const paymentSuccessTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Payment Successful - ${data.planName} Plan Activated | HRZio`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header header-success">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">✓</div>
            <h1>Payment Successful!</h1>
            <p>Your subscription has been activated</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Thank you for your payment! We're excited to have you on the <strong>${data.planName}</strong> plan. Your subscription is now active and all premium features are available.</p>

            <div class="success-box">
              <div style="text-align: center;">
                <span class="status-badge status-success">✓ Payment Confirmed</span>
              </div>
              <div class="amount-large amount-success" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #065f46; margin: 0; font-weight: 500;">Total Amount Paid</p>
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
                  <td class="value" style="color: #4f46e5;">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? '🎉 Annual (Save 17%)' : 'Monthly'}</td>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing?tab=invoices&invoice=${data.invoiceNumber}" class="btn btn-success">View Invoice</a>
            </div>

            <div class="highlight-box highlight-success">
              <p style="margin: 0; font-weight: 600; color: #065f46;">🚀 What's Next?</p>
              <p style="margin: 8px 0 0 0; color: #047857;">You now have access to all ${data.planName} features. Your next billing date is ${data.expiryDate || new Date(Date.now() + (data.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            </div>

            <p>If you have any questions or need assistance, our support team is always here to help!</p>

            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">This is an automated receipt for your records. Please save this email for your reference.</p>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Modern Human Resource Management System</p>
            <p>Need help? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const paymentFailedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Payment Failed - Action Required for ${data.planName} Plan | HRZio`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header header-danger">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">✗</div>
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>We were unable to process your payment for the <strong>${data.planName}</strong> subscription. Don't worry, your current access remains active while we resolve this.</p>

            <div class="danger-box">
              <div style="text-align: center;">
                <span class="status-badge status-danger">✗ Payment Unsuccessful</span>
              </div>
              <div class="amount-large amount-danger" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #991b1b; margin: 0; font-weight: 500;">Amount Due</p>
              <table style="margin-top: 20px;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value">${data.planName}</td>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-danger">Update Payment Method</a>
            </div>

            <div class="highlight-box highlight-danger">
              <p style="margin: 0; font-weight: 600; color: #991b1b;">💡 Common Reasons for Payment Failure:</p>
              <ul style="margin: 12px 0 0 0; color: #b91c1c;">
                <li>Insufficient funds in your account</li>
                <li>Card expired or incorrect details</li>
                <li>Payment declined by your bank</li>
                <li>International transactions blocked</li>
              </ul>
            </div>

            <div class="card">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b;">⏰ What Happens Next?</p>
              <ul class="feature-list" style="margin: 0;">
                <li><span class="feature-icon">1</span> We'll automatically retry the payment in 24 hours</li>
                <li><span class="feature-icon">2</span> You can manually retry payment anytime from your billing page</li>
                <li><span class="feature-icon">3</span> Your access will continue during this period</li>
              </ul>
            </div>

            <p>If you continue to experience issues, please contact your bank or try a different payment method. Our support team is ready to assist you!</p>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Need immediate help? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

export const invoiceGeneratedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Invoice ${data.invoiceNumber} - ${data.planName} Plan | HRZio`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header header-info">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">📄</div>
            <h1>New Invoice Generated</h1>
            <p>Your invoice is ready for review</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>A new invoice has been generated for your <strong>${data.planName}</strong> subscription.</p>

            <div class="invoice-box">
              <div style="text-align: center;">
                <span class="status-badge status-info">📋 Invoice Ready</span>
              </div>
              <h2 style="margin: 16px 0 20px 0; text-align: center; color: #1e293b; font-size: 24px;">Invoice #${data.invoiceNumber}</h2>
              <div class="amount-large" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #4f46e5; margin: 0 0 20px 0; font-weight: 500;">Total Amount</p>
              <div class="divider"></div>
              <table style="margin: 0;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value" style="color: #4f46e5;">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
                </tr>
                <tr>
                  <td class="label">Invoice Date</td>
                  <td class="value">${data.paymentDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                ${data.billingPeriodStart && data.billingPeriodEnd ? `
                <tr>
                  <td class="label">Service Period</td>
                  <td class="value">${new Date(data.billingPeriodStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date(data.billingPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing?tab=invoices&invoice=${data.invoiceNumber}" class="btn">View & Download Invoice</a>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; color: #1e293b;">Thank you for choosing <strong>HRZio</strong> for your human resource management needs. We're committed to helping your business grow!</p>
            </div>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Modern Human Resource Management System</p>
            <p>Questions? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

// Subscription Activated Template - Welcoming theme with brand colors
export const subscriptionActivatedTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Welcome to ${data.planName}! Your HRZio Subscription is Active`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">🎉</div>
            <h1>Welcome to ${data.planName}!</h1>
            <p>Your subscription is now active</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Congratulations! Your <strong>${data.planName}</strong> subscription has been activated. You now have access to all the powerful features that will help streamline your HR operations.</p>

            <div class="success-box">
              <div style="text-align: center;">
                <span class="status-badge status-success">✓ Subscription Active</span>
                <h2 style="margin: 16px 0 8px 0; color: #065f46; font-size: 28px;">${data.planName} Plan</h2>
                <p style="color: #047857; margin: 0;">${data.billingCycle === 'yearly' ? 'Annual Subscription' : 'Monthly Subscription'}</p>
              </div>
            </div>

            <div class="card">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">🚀 What's Included in Your Plan</h3>
              <ul class="feature-list" style="margin: 0;">
                <li><span class="feature-icon">✓</span> Employee Management & Directory</li>
                <li><span class="feature-icon">✓</span> Attendance & Leave Tracking</li>
                <li><span class="feature-icon">✓</span> Payroll Processing</li>
                <li><span class="feature-icon">✓</span> Performance Management</li>
                <li><span class="feature-icon">✓</span> Reports & Analytics</li>
              </ul>
            </div>

            <div class="card">
              <table style="margin: 0;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value" style="color: #4f46e5;">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? 'Annual (Save 17%)' : 'Monthly'}</td>
                </tr>
                <tr>
                  <td class="label">Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="label">Next Billing Date</td>
                  <td class="value">${data.expiryDate || new Date(Date.now() + (data.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/dashboard" class="btn">Go to Dashboard</a>
            </div>

            <div class="highlight-box highlight-success">
              <p style="margin: 0; font-weight: 600; color: #065f46;">💡 Pro Tip</p>
              <p style="margin: 8px 0 0 0; color: #047857;">Start by setting up your organization structure and inviting your team members. Our onboarding wizard will guide you through the process!</p>
            </div>

            <p>If you have any questions or need help getting started, our support team is always here to assist you.</p>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Modern Human Resource Management System</p>
            <p>Need help? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

// Plan Expiring Template - Warning theme with amber/orange colors
export const planExpiringTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `⚠️ Your ${data.planName} Plan Expires in ${data.daysUntilExpiry || 7} Days | HRZio`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header header-warning">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">⚠️</div>
            <h1>Plan Expiring Soon</h1>
            <p>Action required to continue your service</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Your <strong>${data.planName}</strong> subscription is expiring soon. To avoid any interruption in service, please renew your plan before the expiry date.</p>

            <div class="countdown-box">
              <div class="countdown-number">${data.daysUntilExpiry || 7}</div>
              <div class="countdown-label">Days Remaining</div>
            </div>

            <div class="warning-box">
              <div style="text-align: center;">
                <span class="status-badge status-warning">⚠️ Expiring Soon</span>
              </div>
              <table style="margin-top: 16px;">
                <tr>
                  <td class="label">Current Plan</td>
                  <td class="value" style="color: #92400e;">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Expiry Date</td>
                  <td class="value" style="color: #b45309; font-weight: 700;">${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td class="label">Renewal Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-warning">Renew Now</a>
            </div>

            <div class="highlight-box highlight-warning">
              <p style="margin: 0; font-weight: 600; color: #92400e;">⏰ What happens if you don't renew?</p>
              <ul style="margin: 12px 0 0 0; color: #b45309;">
                <li>Your access to premium features will be suspended</li>
                <li>Employee data will be preserved but read-only</li>
                <li>Payroll processing will be disabled</li>
                <li>You can reactivate anytime by renewing</li>
              </ul>
            </div>

            <div class="card">
              <p style="margin: 0; font-weight: 600; color: #1e293b;">💡 Save 17% with Annual Billing</p>
              <p style="margin: 8px 0 0 0; color: #64748b;">Switch to annual billing and save on your subscription costs. Contact our team to learn more about the benefits!</p>
            </div>

            <p>Don't lose access to your HR tools! Renew today to continue managing your workforce efficiently.</p>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Need help with renewal? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

// Plan Expired Template - Urgent danger theme
export const planExpiredTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `🚨 Your ${data.planName} Plan Has Expired | HRZio`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header header-danger">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">🚨</div>
            <h1>Plan Expired</h1>
            <p>Your subscription needs immediate attention</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Your <strong>${data.planName}</strong> subscription has expired. Your account has been moved to limited access mode. Renew now to restore full functionality.</p>

            <div class="danger-box">
              <div style="text-align: center;">
                <span class="status-badge status-danger">✗ Subscription Expired</span>
                <h2 style="margin: 16px 0 8px 0; color: #991b1b; font-size: 24px;">${data.planName} Plan</h2>
                <p style="color: #b91c1c; margin: 0;">Expired on ${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #991b1b;">🔒 Limited Access Mode</p>
              <ul style="margin: 0; color: #b91c1c;">
                <li>❌ Payroll processing disabled</li>
                <li>❌ New employee additions blocked</li>
                <li>❌ Report generation unavailable</li>
                <li>✓ Data is safe and preserved</li>
                <li>✓ Read-only access to records</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-danger">Reactivate Now</a>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">Restore full access instantly</p>
            </div>

            <div class="card">
              <table style="margin: 0;">
                <tr>
                  <td class="label">Previous Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Expired On</td>
                  <td class="value" style="color: #dc2626;">${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td class="label">Reactivation Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; font-weight: 600; color: #1e293b;">📞 Need Assistance?</p>
              <p style="margin: 8px 0 0 0;">Our team is ready to help you get back on track. If you're facing any payment issues or need to discuss your options, reach out to us!</p>
            </div>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Urgent support? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,
});

// Subscription Cancelled Template - Neutral farewell theme
export const subscriptionCancelledTemplate = (data: BillingEmailData): { subject: string; html: string } => ({
  subject: `Subscription Cancelled - We'll Miss You | HRZio`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <div class="header" style="background: linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%);">
            <div class="logo">HRZ<span>io</span></div>
            <div class="icon">👋</div>
            <h1>Subscription Cancelled</h1>
            <p>We're sorry to see you go</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>We've received your cancellation request for the <strong>${data.planName}</strong> plan. Your subscription has been successfully cancelled.</p>

            <div class="card" style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 2px solid #cbd5e1;">
              <div style="text-align: center;">
                <span class="status-badge" style="background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); color: #475569; border: 1px solid #94a3b8;">Subscription Cancelled</span>
              </div>
              <table style="margin-top: 16px;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Access Until</td>
                  <td class="value">${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td class="label">Final Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; font-weight: 600; color: #1e293b;">📋 Important Information</p>
              <ul style="margin: 12px 0 0 0;">
                <li>You'll have access until ${data.expiryDate || 'the end of your billing period'}</li>
                <li>Your data will be preserved for 30 days after expiry</li>
                <li>You can export your data anytime before the expiry</li>
                <li>Reactivate anytime to pick up where you left off</li>
              </ul>
            </div>

            <div class="card">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b;">💭 We'd Love Your Feedback</p>
              <p style="margin: 0; color: #64748b;">Your feedback helps us improve. Would you mind sharing why you decided to cancel? We're always working to make HRZio better.</p>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-secondary">Reactivate Subscription</a>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">Changed your mind? You can reactivate anytime!</p>
            </div>

            <p style="margin-top: 24px;">Thank you for being part of the HRZio family. We hope to see you again in the future!</p>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p>Questions? Email us at <a href="mailto:${data.supportEmail || 'support@hrzio.com'}">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
          </div>
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
