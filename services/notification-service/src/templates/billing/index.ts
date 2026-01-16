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

// Animated GIF URLs for email templates (hosted on reliable CDNs)
const animations = {
  success: 'https://cdn.jsdelivr.net/gh/AlfredoRamos/animated-icons@main/icons/check-circle.gif',
  celebration: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
  failed: 'https://cdn.jsdelivr.net/gh/AlfredoRamos/animated-icons@main/icons/x-circle.gif',
  warning: 'https://cdn.jsdelivr.net/gh/AlfredoRamos/animated-icons@main/icons/alert-triangle.gif',
  invoice: 'https://cdn.jsdelivr.net/gh/AlfredoRamos/animated-icons@main/icons/file-text.gif',
  rocket: 'https://media.giphy.com/media/l0HlTU9Sg8tiYRlHW/giphy.gif',
  clock: 'https://media.giphy.com/media/3o7TKP9ln2Dr6ze6Na/giphy.gif',
  expired: 'https://media.giphy.com/media/26BRzQS5HXcEWM7du/giphy.gif',
  wave: 'https://media.giphy.com/media/hTD5mWjEjhXPnPJNIi/giphy.gif',
};

// Beautiful email styles matching HRZio website theme with animations
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
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(79, 70, 229, 0.2); }

    /* Colorful Headers for different email types */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      color: white;
      padding: 50px 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: shimmer 3s infinite;
    }
    @keyframes shimmer {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .header-success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 50%, #22c55e 100%);
    }
    .header-warning {
      background: linear-gradient(135deg, #f12711 0%, #f5af19 50%, #fbbf24 100%);
    }
    .header-danger {
      background: linear-gradient(135deg, #cb2d3e 0%, #ef473a 50%, #f87171 100%);
    }
    .header-info {
      background: linear-gradient(135deg, #396afc 0%, #2948ff 50%, #6366f1 100%);
    }
    .header-welcome {
      background: linear-gradient(135deg, #00d4ff 0%, #0066ff 25%, #4f46e5 50%, #8b5cf6 75%, #d946ef 100%);
    }
    .header-farewell {
      background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 50%, #64748b 100%);
    }
    .header h1 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 4px 8px rgba(0,0,0,0.2); position: relative; }
    .header p { margin: 12px 0 0; opacity: 0.95; font-size: 16px; position: relative; }
    .logo { font-size: 36px; font-weight: 900; margin-bottom: 16px; letter-spacing: -2px; position: relative; }
    .logo span { color: #00d4ff; text-shadow: 0 0 20px rgba(0,212,255,0.5); }

    /* Animated icon container */
    .anim-icon {
      width: 100px;
      height: 100px;
      margin: 0 auto 20px;
      border-radius: 50%;
      overflow: hidden;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(10px);
      border: 3px solid rgba(255,255,255,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .anim-icon img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .emoji-icon {
      font-size: 50px;
      line-height: 1;
    }

    .content { padding: 40px 30px; }
    .content p { margin-bottom: 16px; color: #475569; font-size: 15px; }

    /* Colorful Footers */
    .footer {
      background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .footer::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #00d4ff, #4f46e5, #8b5cf6, #d946ef, #00d4ff);
      background-size: 200% 100%;
    }
    .footer p { font-size: 13px; color: #94a3b8; margin: 8px 0; }
    .footer a { color: #00d4ff; text-decoration: none; font-weight: 600; }
    .footer-logo { font-size: 28px; font-weight: 900; color: white; margin-bottom: 16px; letter-spacing: -1px; }
    .footer-logo span { color: #00d4ff; }
    .footer-tagline { color: #a5b4fc; font-size: 14px; margin-bottom: 20px; font-style: italic; }
    .social-links { margin: 20px 0; }
    .social-links a {
      display: inline-block;
      width: 40px;
      height: 40px;
      margin: 0 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      line-height: 40px;
      color: white;
      text-decoration: none;
      font-size: 18px;
      transition: background 0.3s;
    }
    .footer-success { background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); }
    .footer-success::before { background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #a7f3d0, #10b981); }
    .footer-warning { background: linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%); }
    .footer-warning::before { background: linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d, #fde68a, #f59e0b); }
    .footer-danger { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%); }
    .footer-danger::before { background: linear-gradient(90deg, #ef4444, #f87171, #fca5a5, #fecaca, #ef4444); }
    .footer-info { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%); }
    .footer-info::before { background: linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd, #bfdbfe, #3b82f6); }

    .btn {
      display: inline-block;
      padding: 16px 36px;
      background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn-success { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); }
    .btn-warning { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4); color: #78350f !important; }
    .btn-danger { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4); }
    .btn-secondary { background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%); box-shadow: 0 8px 25px rgba(100, 116, 139, 0.3); }

    .card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 24px;
      border-radius: 16px;
      margin: 24px 0;
      border: 2px solid #e2e8f0;
    }
    .invoice-box {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 30%, #c7d2fe 60%, #fae8ff 100%);
      padding: 30px;
      border-radius: 16px;
      margin: 24px 0;
      border: 3px solid #a5b4fc;
      position: relative;
      overflow: hidden;
    }
    .invoice-box::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #4f46e5, #8b5cf6, #d946ef);
    }
    .success-box {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%);
      padding: 30px;
      border-radius: 16px;
      margin: 24px 0;
      border: 3px solid #34d399;
    }
    .warning-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
      padding: 30px;
      border-radius: 16px;
      margin: 24px 0;
      border: 3px solid #f59e0b;
    }
    .danger-box {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%);
      padding: 30px;
      border-radius: 16px;
      margin: 24px 0;
      border: 3px solid #f87171;
    }
    .amount-large {
      font-size: 52px;
      font-weight: 900;
      background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 50%, #d946ef 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 10px 0;
      letter-spacing: -2px;
    }
    .amount-success {
      background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .amount-warning {
      background: linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .amount-danger {
      background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .status-badge {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 700;
      margin: 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-success { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; }
    .status-danger { background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); color: white; }
    .status-warning { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: #78350f; }
    .status-info { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td { padding: 14px 0; border-bottom: 1px solid #e2e8f0; }
    td:last-child { text-align: right; }
    .label { color: #64748b; font-size: 14px; font-weight: 500; }
    .value { font-weight: 700; color: #1e293b; font-size: 15px; }
    .divider { height: 3px; background: linear-gradient(90deg, #4f46e5, #8b5cf6, #d946ef, #8b5cf6, #4f46e5); margin: 24px 0; border-radius: 2px; }
    ul { padding-left: 20px; margin: 16px 0; }
    li { margin: 10px 0; color: #475569; }
    .highlight-box {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%);
      border-left: 5px solid #4f46e5;
      padding: 20px 24px;
      border-radius: 0 12px 12px 0;
      margin: 20px 0;
    }
    .highlight-success {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%);
      border-left-color: #10b981;
    }
    .highlight-warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
      border-left-color: #f59e0b;
    }
    .highlight-danger {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%);
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
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      border-radius: 16px;
      padding: 30px;
      margin: 20px 0;
      text-align: center;
      border: 3px solid #475569;
    }
    .countdown-number {
      font-size: 72px;
      font-weight: 900;
      background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      letter-spacing: -4px;
    }
    .countdown-label {
      color: #94a3b8;
      font-size: 16px;
      margin-top: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }
    .feature-list {
      list-style: none;
      padding: 0;
    }
    .feature-list li {
      padding: 14px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
    }
    .feature-list li:last-child { border-bottom: none; }
    .feature-icon {
      width: 28px;
      height: 28px;
      margin-right: 14px;
      background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: 700;
    }
    .confetti-bg {
      background-image: url('https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif');
      background-size: cover;
      background-position: center;
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
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif" alt="Success" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>✓</span>'" />
            </div>
            <h1>Payment Successful!</h1>
            <p>Your subscription has been activated</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Thank you for your payment! We're excited to have you on the <strong>${data.planName}</strong> plan. Your subscription is now active and all premium features are available.</p>

            <div class="success-box">
              <div style="text-align: center;">
                <span class="status-badge status-success">✓ PAYMENT CONFIRMED</span>
              </div>
              <div class="amount-large amount-success" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #065f46; margin: 0; font-weight: 600;">Total Amount Paid</p>
            </div>

            <div class="card">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 700;">📄 Invoice Details</h3>
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
                  <td class="value" style="color: #10b981; font-weight: 700;">${data.planName}</td>
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
                <h4 style="margin: 16px 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">Line Items</h4>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing?tab=invoices&invoice=${data.invoiceNumber}" class="btn btn-success">VIEW INVOICE</a>
            </div>

            <div class="highlight-box highlight-success">
              <p style="margin: 0; font-weight: 700; color: #065f46; font-size: 16px;">🚀 What's Next?</p>
              <p style="margin: 10px 0 0 0; color: #047857;">You now have access to all ${data.planName} features. Your next billing date is ${data.expiryDate || new Date(Date.now() + (data.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            </div>

            <p>If you have any questions or need assistance, our support team is always here to help!</p>

            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">This is an automated receipt for your records. Please save this email for your reference.</p>
          </div>
          <div class="footer footer-success">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"Empowering HR, One Click at a Time"</p>
            <div class="divider" style="background: linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981); margin: 16px auto; width: 60%;"></div>
            <p style="color: #a7f3d0;">Modern Human Resource Management System</p>
            <p>Need help? <a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #6ee7b7;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #6ee7b7; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/3oEjHKvjqt5pssL99C/giphy.gif" alt="Failed" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>✗</span>'" />
            </div>
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>We were unable to process your payment for the <strong>${data.planName}</strong> subscription. Don't worry, your current access remains active while we resolve this.</p>

            <div class="danger-box">
              <div style="text-align: center;">
                <span class="status-badge status-danger">✗ PAYMENT UNSUCCESSFUL</span>
              </div>
              <div class="amount-large amount-danger" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #991b1b; margin: 0; font-weight: 600;">Amount Due</p>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-danger">UPDATE PAYMENT METHOD</a>
            </div>

            <div class="highlight-box highlight-danger">
              <p style="margin: 0; font-weight: 700; color: #991b1b; font-size: 16px;">💡 Common Reasons for Payment Failure:</p>
              <ul style="margin: 12px 0 0 0; color: #b91c1c;">
                <li>Insufficient funds in your account</li>
                <li>Card expired or incorrect details</li>
                <li>Payment declined by your bank</li>
                <li>International transactions blocked</li>
              </ul>
            </div>

            <div class="card">
              <p style="margin: 0 0 16px 0; font-weight: 700; color: #1e293b; font-size: 16px;">⏰ What Happens Next?</p>
              <ul class="feature-list" style="margin: 0;">
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);">1</span> We'll automatically retry the payment in 24 hours</li>
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);">2</span> You can manually retry payment anytime from your billing page</li>
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);">3</span> Your access will continue during this period</li>
              </ul>
            </div>

            <p>If you continue to experience issues, please contact your bank or try a different payment method. Our support team is ready to assist you!</p>
          </div>
          <div class="footer footer-danger">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"We're here to help you get back on track"</p>
            <div class="divider" style="background: linear-gradient(90deg, #ef4444, #f87171, #fca5a5, #f87171, #ef4444); margin: 16px auto; width: 60%;"></div>
            <p style="color: #fca5a5;">Need immediate assistance?</p>
            <p><a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #fecaca; font-size: 16px;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #fca5a5; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/3oKIPrc2ngFZ6BTyww/giphy.gif" alt="Invoice" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>📄</span>'" />
            </div>
            <h1>Invoice Generated</h1>
            <p>Your invoice is ready for review</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>A new invoice has been generated for your <strong>${data.planName}</strong> subscription.</p>

            <div class="invoice-box">
              <div style="text-align: center;">
                <span class="status-badge status-info">📋 INVOICE READY</span>
              </div>
              <h2 style="margin: 20px 0; text-align: center; color: #1e293b; font-size: 28px; font-weight: 800;">Invoice #${data.invoiceNumber}</h2>
              <div class="amount-large" style="text-align: center;">
                ${data.currency} ${data.amount.toLocaleString('en-IN')}
              </div>
              <p style="text-align: center; color: #4f46e5; margin: 0 0 24px 0; font-weight: 600;">Total Amount</p>
              <div class="divider"></div>
              <table style="margin: 0;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value" style="color: #3b82f6; font-weight: 700;">${data.planName}</td>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing?tab=invoices&invoice=${data.invoiceNumber}" class="btn">VIEW & DOWNLOAD INVOICE</a>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; color: #1e293b; font-size: 15px;">Thank you for choosing <strong style="color: #4f46e5;">HRZio</strong> for your human resource management needs. We're committed to helping your business grow!</p>
            </div>
          </div>
          <div class="footer footer-info">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"Simplifying HR for Growing Businesses"</p>
            <div class="divider" style="background: linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd, #60a5fa, #3b82f6); margin: 16px auto; width: 60%;"></div>
            <p style="color: #93c5fd;">Modern Human Resource Management System</p>
            <p>Questions? <a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #bfdbfe;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #93c5fd; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
          <div class="header header-welcome">
            <div class="logo">HRZ<span>io</span></div>
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" alt="Welcome" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>🎉</span>'" />
            </div>
            <h1>Welcome to ${data.planName}!</h1>
            <p>Your subscription is now active</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Congratulations! Your <strong>${data.planName}</strong> subscription has been activated. You now have access to all the powerful features that will help streamline your HR operations.</p>

            <div class="success-box">
              <div style="text-align: center;">
                <span class="status-badge status-success">✓ SUBSCRIPTION ACTIVE</span>
                <h2 style="margin: 20px 0 10px 0; color: #065f46; font-size: 32px; font-weight: 800;">${data.planName} Plan</h2>
                <p style="color: #047857; margin: 0; font-size: 16px;">${data.billingCycle === 'yearly' ? '🎊 Annual Subscription' : 'Monthly Subscription'}</p>
              </div>
            </div>

            <div class="card">
              <h3 style="margin: 0 0 20px 0; color: #1e293b; font-size: 18px; font-weight: 700;">🚀 What's Included in Your Plan</h3>
              <ul class="feature-list" style="margin: 0;">
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">✓</span> Employee Management & Directory</li>
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">✓</span> Attendance & Leave Tracking</li>
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">✓</span> Payroll Processing</li>
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">✓</span> Performance Management</li>
                <li><span class="feature-icon" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%);">✓</span> Reports & Analytics</li>
              </ul>
            </div>

            <div class="card">
              <table style="margin: 0;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value" style="color: #8b5cf6; font-weight: 700;">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Billing Cycle</td>
                  <td class="value">${data.billingCycle === 'yearly' ? '🎉 Annual (Save 17%)' : 'Monthly'}</td>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/dashboard" class="btn">GET STARTED NOW</a>
            </div>

            <div class="highlight-box highlight-success">
              <p style="margin: 0; font-weight: 700; color: #065f46; font-size: 16px;">💡 Pro Tip</p>
              <p style="margin: 10px 0 0 0; color: #047857;">Start by setting up your organization structure and inviting your team members. Our onboarding wizard will guide you through the process!</p>
            </div>

            <p>If you have any questions or need help getting started, our support team is always here to assist you.</p>
          </div>
          <div class="footer">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"Your Journey to Smarter HR Starts Here"</p>
            <div class="divider" style="background: linear-gradient(90deg, #00d4ff, #4f46e5, #8b5cf6, #d946ef, #00d4ff); margin: 16px auto; width: 60%;"></div>
            <p style="color: #a5b4fc;">Modern Human Resource Management System</p>
            <p>Need help? <a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #00d4ff;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #a5b4fc; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/3o7TKP9ln2Dr6ze6Na/giphy.gif" alt="Warning" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>⏰</span>'" />
            </div>
            <h1>Plan Expiring Soon!</h1>
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
                <span class="status-badge status-warning">⚠️ EXPIRING SOON</span>
              </div>
              <table style="margin-top: 20px;">
                <tr>
                  <td class="label">Current Plan</td>
                  <td class="value" style="color: #b45309; font-weight: 700;">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Expiry Date</td>
                  <td class="value" style="color: #92400e; font-weight: 800; font-size: 16px;">${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
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
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-warning">RENEW NOW</a>
            </div>

            <div class="highlight-box highlight-warning">
              <p style="margin: 0; font-weight: 700; color: #92400e; font-size: 16px;">⏰ What happens if you don't renew?</p>
              <ul style="margin: 12px 0 0 0; color: #b45309;">
                <li>Your access to premium features will be suspended</li>
                <li>Employee data will be preserved but read-only</li>
                <li>Payroll processing will be disabled</li>
                <li>You can reactivate anytime by renewing</li>
              </ul>
            </div>

            <div class="card">
              <p style="margin: 0; font-weight: 700; color: #1e293b; font-size: 16px;">💡 Save 17% with Annual Billing</p>
              <p style="margin: 10px 0 0 0; color: #64748b;">Switch to annual billing and save on your subscription costs. Contact our team to learn more about the benefits!</p>
            </div>

            <p>Don't lose access to your HR tools! Renew today to continue managing your workforce efficiently.</p>
          </div>
          <div class="footer footer-warning">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"Don't let your HR go offline"</p>
            <div class="divider" style="background: linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d, #fbbf24, #f59e0b); margin: 16px auto; width: 60%;"></div>
            <p style="color: #fde68a;">Need help with renewal?</p>
            <p><a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #fef3c7; font-size: 16px;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #fde68a; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/26BRzQS5HXcEWM7du/giphy.gif" alt="Expired" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>🚨</span>'" />
            </div>
            <h1>Plan Expired</h1>
            <p>Your subscription needs immediate attention</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>Your <strong>${data.planName}</strong> subscription has expired. Your account has been moved to limited access mode. Renew now to restore full functionality.</p>

            <div class="danger-box">
              <div style="text-align: center;">
                <span class="status-badge status-danger">🚫 SUBSCRIPTION EXPIRED</span>
                <h2 style="margin: 20px 0 10px 0; color: #991b1b; font-size: 28px; font-weight: 800;">${data.planName} Plan</h2>
                <p style="color: #b91c1c; margin: 0; font-weight: 600;">Expired on ${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%); border: 3px solid #f87171;">
              <p style="margin: 0 0 16px 0; font-weight: 700; color: #991b1b; font-size: 16px;">🔒 Limited Access Mode Activated</p>
              <ul style="margin: 0; color: #b91c1c; font-size: 15px;">
                <li style="padding: 6px 0;">❌ Payroll processing disabled</li>
                <li style="padding: 6px 0;">❌ New employee additions blocked</li>
                <li style="padding: 6px 0;">❌ Report generation unavailable</li>
                <li style="padding: 6px 0;">✅ Data is safe and preserved</li>
                <li style="padding: 6px 0;">✅ Read-only access to records</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-danger">REACTIVATE NOW</a>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Restore full access instantly</p>
            </div>

            <div class="card">
              <table style="margin: 0;">
                <tr>
                  <td class="label">Previous Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Expired On</td>
                  <td class="value" style="color: #dc2626; font-weight: 700;">${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td class="label">Reactivation Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; font-weight: 700; color: #1e293b; font-size: 16px;">📞 Need Assistance?</p>
              <p style="margin: 10px 0 0 0;">Our team is ready to help you get back on track. If you're facing any payment issues or need to discuss your options, reach out to us!</p>
            </div>
          </div>
          <div class="footer footer-danger">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"We're here to get you back online"</p>
            <div class="divider" style="background: linear-gradient(90deg, #ef4444, #f87171, #fca5a5, #f87171, #ef4444); margin: 16px auto; width: 60%;"></div>
            <p style="color: #fca5a5;">Urgent support needed?</p>
            <p><a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #fecaca; font-size: 16px;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #fca5a5; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
          <div class="header header-farewell">
            <div class="logo">HRZ<span>io</span></div>
            <div class="anim-icon">
              <img src="https://media.giphy.com/media/hTD5mWjEjhXPnPJNIi/giphy.gif" alt="Goodbye" style="width: 60px; height: 60px;" onerror="this.outerHTML='<span class=emoji-icon>👋</span>'" />
            </div>
            <h1>See You Soon!</h1>
            <p>Your subscription has been cancelled</p>
          </div>
          <div class="content">
            <p>Hi <strong>${data.tenantName}</strong>,</p>
            <p>We've received your cancellation request for the <strong>${data.planName}</strong> plan. Your subscription has been successfully cancelled.</p>

            <div class="card" style="background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%); border: 3px solid #64748b;">
              <div style="text-align: center;">
                <span class="status-badge" style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); color: white;">SUBSCRIPTION CANCELLED</span>
              </div>
              <table style="margin-top: 20px;">
                <tr>
                  <td class="label">Plan</td>
                  <td class="value">${data.planName}</td>
                </tr>
                <tr>
                  <td class="label">Access Until</td>
                  <td class="value" style="color: #475569; font-weight: 700;">${data.expiryDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td class="label">Final Amount</td>
                  <td class="value">${data.currency} ${data.amount.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div class="highlight-box">
              <p style="margin: 0; font-weight: 700; color: #1e293b; font-size: 16px;">📋 Important Information</p>
              <ul style="margin: 12px 0 0 0;">
                <li>You'll have access until ${data.expiryDate || 'the end of your billing period'}</li>
                <li>Your data will be preserved for 30 days after expiry</li>
                <li>You can export your data anytime before the expiry</li>
                <li>Reactivate anytime to pick up where you left off</li>
              </ul>
            </div>

            <div class="card">
              <p style="margin: 0 0 12px 0; font-weight: 700; color: #1e293b; font-size: 16px;">💭 We'd Love Your Feedback</p>
              <p style="margin: 0; color: #64748b;">Your feedback helps us improve. Would you mind sharing why you decided to cancel? We're always working to make HRZio better.</p>
            </div>

            <div style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://hrzio.com'}/billing" class="btn btn-secondary">REACTIVATE SUBSCRIPTION</a>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">Changed your mind? You can reactivate anytime!</p>
            </div>

            <p style="margin-top: 24px;">Thank you for being part of the HRZio family. We hope to see you again in the future! 💜</p>
          </div>
          <div class="footer" style="background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);">
            <div class="footer-logo">HRZ<span>io</span></div>
            <p class="footer-tagline">"Until we meet again..."</p>
            <div class="divider" style="background: linear-gradient(90deg, #64748b, #94a3b8, #cbd5e1, #94a3b8, #64748b); margin: 16px auto; width: 60%;"></div>
            <p style="color: #94a3b8;">Questions? We're still here for you</p>
            <p><a href="mailto:${data.supportEmail || 'support@hrzio.com'}" style="color: #cbd5e1;">${data.supportEmail || 'support@hrzio.com'}</a></p>
            <p style="margin-top: 24px; color: #64748b; font-size: 12px;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
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
