import { IPaystub } from '../models/Paystub';
import { ILoan } from '../models/Loan';
import { IReimbursement } from '../models/Reimbursement';
import { IBonus } from '../models/Bonus';
import { ISalaryRevision } from '../models/SalaryRevision';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationPayload {
  type: 'email' | 'sms' | 'push' | 'in_app';
  recipient: {
    id: string;
    email?: string;
    phone?: string;
    deviceToken?: string;
  };
  template: EmailTemplate;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

// HRZio Brand Email Base Styles
const emailBaseStyles = `
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
    .header-success { background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%); }
    .header-warning { background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%); }
    .header-info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%); }
    .header-payroll { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #8b5cf6 100%); }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header p { margin: 10px 0 0; opacity: 0.95; font-size: 16px; }
    .logo { font-size: 32px; font-weight: 800; margin-bottom: 20px; letter-spacing: -1px; }
    .logo span { color: #00d4ff; }
    .icon { width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.3); }
    .content { padding: 40px 30px; }
    .content p { margin-bottom: 16px; color: #475569; font-size: 15px; }
    .footer { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { font-size: 13px; color: #64748b; margin: 8px 0; }
    .footer a { color: #4f46e5; text-decoration: none; font-weight: 500; }
    .footer-logo { font-size: 20px; font-weight: 700; color: #4f46e5; margin-bottom: 12px; }
    .footer-logo span { color: #8b5cf6; }
    .card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .summary-box { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #fae8ff 100%); padding: 30px; border-radius: 12px; margin: 24px 0; border: 2px solid #c7d2fe; }
    .success-box { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border: 2px solid #6ee7b7; }
    .amount-large { font-size: 42px; font-weight: 800; background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 10px 0; }
    .amount-success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 10px 0; }
    .status-success { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; border: 1px solid #6ee7b7; }
    .status-info { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af; border: 1px solid #93c5fd; }
    .status-warning { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border: 1px solid #fcd34d; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    td, th { padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
    td:last-child, th:last-child { text-align: right; }
    .label { color: #64748b; font-size: 14px; font-weight: 500; }
    .value { font-weight: 600; color: #1e293b; font-size: 15px; }
    .divider { height: 2px; background: linear-gradient(90deg, #4f46e5, #8b5cf6, #d946ef); margin: 24px 0; border-radius: 1px; }
    .highlight-box { background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%); color: white !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); }
  </style>
`;

// Email sending interface - to be implemented with actual email provider
export async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  // This would integrate with email providers like SendGrid, AWS SES, etc.
  console.log(`[Email] Sending to ${payload.recipient.email}: ${payload.template.subject}`);

  // Simulated implementation
  return {
    success: true,
    messageId: `msg_${Date.now()}`,
    sentAt: new Date()
  };
}

// SMS sending interface
export async function sendSMS(payload: NotificationPayload): Promise<NotificationResult> {
  console.log(`[SMS] Sending to ${payload.recipient.phone}`);

  return {
    success: true,
    messageId: `sms_${Date.now()}`,
    sentAt: new Date()
  };
}

// ================= Payslip Notifications =================

export function generatePayslipEmailTemplate(
  paystub: IPaystub,
  companyName: string
): EmailTemplate {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[paystub.payPeriod.month - 1];

  return {
    subject: `Payslip for ${monthName} ${paystub.payPeriod.year} | ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${emailBaseStyles}</head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header header-payroll">
              <div class="logo">HRZ<span>io</span></div>
              <div class="icon">💰</div>
              <h1>Payslip Ready</h1>
              <p>${monthName} ${paystub.payPeriod.year}</p>
            </div>
            <div class="content">
              <p>Dear <strong>${paystub.employeeDetails.name}</strong>,</p>
              <p>Your payslip for <strong>${monthName} ${paystub.payPeriod.year}</strong> is now available. Here's a summary of your earnings.</p>

              <div class="success-box">
                <div style="text-align: center;">
                  <span class="status-badge status-success">✓ Salary Processed</span>
                </div>
                <div class="amount-large amount-success" style="text-align: center;">
                  ₹${paystub.summary.netPay.toLocaleString('en-IN')}
                </div>
                <p style="text-align: center; color: #065f46; margin: 0; font-weight: 500;">Net Pay</p>
              </div>

              <div class="card">
                <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">📊 Pay Summary</h3>
                <table>
                  <tr>
                    <td class="label">Gross Earnings</td>
                    <td class="value" style="color: #10b981;">₹${paystub.summary.grossEarnings.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td class="label">Total Deductions</td>
                    <td class="value" style="color: #ef4444;">- ₹${paystub.summary.totalDeductions.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
                <div class="divider"></div>
                <table style="margin: 0;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 18px; font-weight: 600; color: #1e293b;">Net Pay</td>
                    <td style="text-align: right; font-weight: 800; font-size: 20px; color: #10b981;">₹${paystub.summary.netPay.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </div>

              <div class="highlight-box">
                <p style="margin: 0; font-weight: 600; color: #1e293b;">📎 Attachment</p>
                <p style="margin: 8px 0 0 0;">Your detailed payslip is attached to this email as a PDF. Please download and save it for your records.</p>
              </div>

              <p>If you have any questions regarding your payslip, please contact the HR department.</p>

              <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">This is an automated email. Please do not reply directly to this message.</p>
            </div>
            <div class="footer">
              <div class="footer-logo">HRZ<span>io</span></div>
              <p><strong>${companyName}</strong></p>
              <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Payslip - ${monthName} ${paystub.payPeriod.year}

Dear ${paystub.employeeDetails.name},

Your payslip for ${monthName} ${paystub.payPeriod.year} is now available.

Pay Summary:
- Gross Earnings: ₹${paystub.summary.grossEarnings.toLocaleString('en-IN')}
- Total Deductions: ₹${paystub.summary.totalDeductions.toLocaleString('en-IN')}
- Net Pay: ₹${paystub.summary.netPay.toLocaleString('en-IN')}

Please find the detailed payslip attached to this email.

Best Regards,
${companyName}
    `
  };
}

export async function sendPayslipNotification(
  paystub: IPaystub,
  employeeEmail: string,
  pdfBuffer: Buffer,
  companyName: string
): Promise<NotificationResult> {
  const template = generatePayslipEmailTemplate(paystub, companyName);

  return sendEmail({
    type: 'email',
    recipient: { id: paystub.employeeId, email: employeeEmail },
    template,
    attachments: [{
      filename: `Payslip_${paystub.payPeriod.month}_${paystub.payPeriod.year}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });
}

// ================= Salary Revision Notifications =================

export function generateSalaryRevisionEmailTemplate(
  revision: ISalaryRevision,
  employeeName: string,
  companyName: string
): EmailTemplate {
  const revisionTypeText = {
    increment: 'Salary Increment',
    promotion: 'Promotion',
    adjustment: 'Salary Adjustment',
    correction: 'Salary Correction',
    annual_review: 'Annual Review'
  };

  const revisionIcons: Record<string, string> = {
    increment: '📈',
    promotion: '🎉',
    adjustment: '⚖️',
    correction: '✏️',
    annual_review: '📋'
  };

  return {
    subject: `${revisionTypeText[revision.revisionType]} Notification | ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${emailBaseStyles}</head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header header-success">
              <div class="logo">HRZ<span>io</span></div>
              <div class="icon">${revisionIcons[revision.revisionType] || '📈'}</div>
              <h1>${revisionTypeText[revision.revisionType]}</h1>
              <p>Congratulations on your achievement!</p>
            </div>
            <div class="content">
              <p>Dear <strong>${employeeName}</strong>,</p>
              <p>We are pleased to inform you about your <strong>${revisionTypeText[revision.revisionType].toLowerCase()}</strong>. Your dedication and hard work have been recognized!</p>

              <div class="success-box">
                <div style="text-align: center;">
                  <span class="status-badge status-success">🎊 ${revisionTypeText[revision.revisionType]}</span>
                </div>
                <div style="display: flex; justify-content: center; gap: 20px; margin: 20px 0; flex-wrap: wrap;">
                  <div style="text-align: center; padding: 16px;">
                    <p style="color: #065f46; font-size: 14px; margin: 0;">Increment</p>
                    <p style="font-size: 28px; font-weight: 800; color: #10b981; margin: 8px 0;">+${revision.incrementPercentage}%</p>
                  </div>
                  <div style="text-align: center; padding: 16px;">
                    <p style="color: #065f46; font-size: 14px; margin: 0;">Amount</p>
                    <p style="font-size: 28px; font-weight: 800; color: #10b981; margin: 8px 0;">₹${revision.incrementAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">📊 Revised Compensation</h3>
                <table>
                  <tr style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);">
                    <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #475569;">Component</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #475569;">Previous</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #10b981;">New</th>
                  </tr>
                  <tr>
                    <td style="padding: 12px 8px;" class="label">Basic Salary</td>
                    <td style="padding: 12px 8px; text-align: right; color: #64748b;">₹${revision.previousSalary.basic.toLocaleString('en-IN')}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #10b981;">₹${revision.newSalary.basic.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 8px;" class="label">Gross Salary</td>
                    <td style="padding: 12px 8px; text-align: right; color: #64748b;">₹${revision.previousSalary.gross.toLocaleString('en-IN')}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #10b981;">₹${revision.newSalary.gross.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
                <div class="divider"></div>
                <table style="margin: 0;">
                  <tr>
                    <td style="padding: 12px 8px; font-size: 16px; font-weight: 700; color: #1e293b;">Annual CTC</td>
                    <td style="padding: 12px 8px; text-align: right; color: #64748b; font-weight: 600;">₹${revision.previousSalary.ctc.toLocaleString('en-IN')}</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: 800; font-size: 18px; color: #10b981;">₹${revision.newSalary.ctc.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </div>

              <div class="highlight-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left-color: #10b981;">
                <p style="margin: 0; font-weight: 600; color: #065f46;">📅 Effective Date</p>
                <p style="margin: 8px 0 0 0; color: #047857; font-size: 18px; font-weight: 700;">${new Date(revision.effectiveDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <p>We appreciate your contributions and look forward to your continued success with us!</p>

              <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">This is an automated notification. For questions, please contact HR.</p>
            </div>
            <div class="footer">
              <div class="footer-logo">HRZ<span>io</span></div>
              <p><strong>${companyName}</strong></p>
              <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${revisionTypeText[revision.revisionType]} Notification

Dear ${employeeName},

We are pleased to inform you about your ${revisionTypeText[revision.revisionType].toLowerCase()}.

Revised Compensation:
- Previous CTC: ₹${revision.previousSalary.ctc.toLocaleString('en-IN')}
- New CTC: ₹${revision.newSalary.ctc.toLocaleString('en-IN')}
- Increment: ₹${revision.incrementAmount.toLocaleString('en-IN')} (${revision.incrementPercentage}%)

Effective Date: ${new Date(revision.effectiveDate).toLocaleDateString('en-IN')}

Congratulations!

Best Regards,
${companyName}
    `
  };
}

// ================= Loan Notifications =================

export function generateLoanApprovalEmailTemplate(
  loan: ILoan,
  employeeName: string,
  companyName: string,
  approved: boolean
): EmailTemplate {
  if (approved) {
    return {
      subject: `Loan Application Approved | ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>${emailBaseStyles}</head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header header-success">
                <div class="logo">HRZ<span>io</span></div>
                <div class="icon">✓</div>
                <h1>Loan Approved</h1>
                <p>Your application has been approved</p>
              </div>
              <div class="content">
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>Great news! Your loan application has been <strong>approved</strong>. Please find the details below.</p>

                <div class="success-box">
                  <div style="text-align: center;">
                    <span class="status-badge status-success">✓ Approved</span>
                    <p style="color: #065f46; font-size: 14px; margin: 16px 0 8px 0;">Loan Amount</p>
                    <div class="amount-large amount-success">₹${loan.principalAmount.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div class="card">
                  <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">📋 Loan Details</h3>
                  <table>
                    <tr>
                      <td class="label">Loan Number</td>
                      <td class="value" style="color: #4f46e5;">${loan.loanNumber}</td>
                    </tr>
                    <tr>
                      <td class="label">Loan Type</td>
                      <td class="value">${loan.loanType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                    </tr>
                    <tr>
                      <td class="label">Principal Amount</td>
                      <td class="value">₹${loan.principalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td class="label">EMI Amount</td>
                      <td class="value" style="color: #10b981;">₹${loan.emiAmount.toLocaleString('en-IN')}/month</td>
                    </tr>
                    <tr>
                      <td class="label">Tenure</td>
                      <td class="value">${loan.tenure} ${loan.tenureType}</td>
                    </tr>
                  </table>
                </div>

                <div class="highlight-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left-color: #10b981;">
                  <p style="margin: 0; font-weight: 600; color: #065f46;">💰 Disbursement</p>
                  <p style="margin: 8px 0 0 0; color: #047857;">The loan amount will be disbursed as per the company policy. You will receive the funds in your registered bank account.</p>
                </div>

                <p>If you have any questions, please contact the HR department.</p>
              </div>
              <div class="footer">
                <div class="footer-logo">HRZ<span>io</span></div>
                <p><strong>${companyName}</strong></p>
                <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Loan Application Approved\n\nDear ${employeeName},\n\nYour loan application (${loan.loanNumber}) for ₹${loan.principalAmount.toLocaleString('en-IN')} has been approved.\n\nEMI: ₹${loan.emiAmount.toLocaleString('en-IN')}\nTenure: ${loan.tenure} ${loan.tenureType}\n\nBest Regards,\n${companyName}`
    };
  } else {
    return {
      subject: `Loan Application Update | ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>${emailBaseStyles}</head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header header-warning">
                <div class="logo">HRZ<span>io</span></div>
                <div class="icon">📋</div>
                <h1>Loan Application Update</h1>
                <p>Status update on your application</p>
              </div>
              <div class="content">
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>We regret to inform you that your loan application could not be approved at this time.</p>

                <div class="card" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #fcd34d;">
                  <div style="text-align: center;">
                    <span class="status-badge status-warning">Application Not Approved</span>
                  </div>
                  <table style="margin-top: 16px;">
                    <tr>
                      <td class="label">Loan Number</td>
                      <td class="value">${loan.loanNumber}</td>
                    </tr>
                    <tr>
                      <td class="label">Requested Amount</td>
                      <td class="value">₹${loan.principalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </table>
                </div>

                <div class="highlight-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #f59e0b;">
                  <p style="margin: 0; font-weight: 600; color: #92400e;">📞 Next Steps</p>
                  <p style="margin: 8px 0 0 0; color: #b45309;">Please contact the HR department for more information about the decision and to discuss alternative options.</p>
                </div>

                <p>We understand this may not be the news you were hoping for. Please feel free to reach out if you have any questions.</p>
              </div>
              <div class="footer">
                <div class="footer-logo">HRZ<span>io</span></div>
                <p><strong>${companyName}</strong></p>
                <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Loan Application Update\n\nDear ${employeeName},\n\nYour loan application (${loan.loanNumber}) could not be approved. Please contact HR for more details.\n\nBest Regards,\n${companyName}`
    };
  }
}

// ================= Reimbursement Notifications =================

export function generateReimbursementStatusEmailTemplate(
  reimbursement: IReimbursement,
  employeeName: string,
  companyName: string
): EmailTemplate {
  const statusText = {
    approved: 'Approved',
    partially_approved: 'Partially Approved',
    rejected: 'Rejected',
    paid: 'Paid'
  };

  const statusConfig: Record<string, { badge: string; icon: string; headerClass: string; boxStyle: string }> = {
    approved: { badge: 'status-success', icon: '✓', headerClass: 'header-success', boxStyle: 'success-box' },
    partially_approved: { badge: 'status-warning', icon: '⚠️', headerClass: 'header-warning', boxStyle: 'card' },
    rejected: { badge: 'status-badge', icon: '✗', headerClass: 'header', boxStyle: 'card' },
    paid: { badge: 'status-success', icon: '💰', headerClass: 'header-success', boxStyle: 'success-box' }
  };

  const config = statusConfig[reimbursement.status] || statusConfig.approved;
  const currentStatus = statusText[reimbursement.status as keyof typeof statusText] || reimbursement.status;

  return {
    subject: `Reimbursement ${currentStatus} - ${reimbursement.claimNumber} | ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${emailBaseStyles}</head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header ${config.headerClass}">
              <div class="logo">HRZ<span>io</span></div>
              <div class="icon">${config.icon}</div>
              <h1>Reimbursement ${currentStatus}</h1>
              <p>Claim #${reimbursement.claimNumber}</p>
            </div>
            <div class="content">
              <p>Dear <strong>${employeeName}</strong>,</p>
              <p>Your reimbursement claim has been processed. Here's the status update:</p>

              <div class="${config.boxStyle}" ${config.boxStyle === 'card' && reimbursement.status === 'rejected' ? 'style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5;"' : ''}>
                <div style="text-align: center;">
                  <span class="${config.badge}">${config.icon} ${currentStatus}</span>
                </div>
                ${reimbursement.status === 'paid' || reimbursement.status === 'approved' ? `
                <div style="text-align: center; margin: 16px 0;">
                  <p style="color: #065f46; font-size: 14px; margin: 0;">Approved Amount</p>
                  <div class="amount-large amount-success">₹${reimbursement.totalApprovedAmount.toLocaleString('en-IN')}</div>
                </div>
                ` : ''}
              </div>

              <div class="card">
                <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">📋 Claim Details</h3>
                <table>
                  <tr>
                    <td class="label">Claim Number</td>
                    <td class="value" style="color: #4f46e5;">${reimbursement.claimNumber}</td>
                  </tr>
                  <tr>
                    <td class="label">Claim Type</td>
                    <td class="value">${reimbursement.claimType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                  </tr>
                  <tr>
                    <td class="label">Claimed Amount</td>
                    <td class="value">₹${reimbursement.totalClaimedAmount.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td class="label">Approved Amount</td>
                    <td class="value" style="color: #10b981; font-weight: 700;">₹${reimbursement.totalApprovedAmount.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td class="label">Status</td>
                    <td class="value">${currentStatus}</td>
                  </tr>
                </table>
              </div>

              ${reimbursement.status === 'paid' ? `
              <div class="highlight-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left-color: #10b981;">
                <p style="margin: 0; font-weight: 600; color: #065f46;">💳 Payment Processed</p>
                <p style="margin: 8px 0 0 0; color: #047857;">The approved amount has been processed and will be credited to your account along with your next salary.</p>
              </div>
              ` : ''}

              <p>If you have any questions about this claim, please contact the HR department.</p>
            </div>
            <div class="footer">
              <div class="footer-logo">HRZ<span>io</span></div>
              <p><strong>${companyName}</strong></p>
              <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Reimbursement ${currentStatus}\n\nClaim: ${reimbursement.claimNumber}\nClaimed: ₹${reimbursement.totalClaimedAmount}\nApproved: ₹${reimbursement.totalApprovedAmount}\n\nBest Regards,\n${companyName}`
  };
}

// ================= Bonus Notifications =================

export function generateBonusNotificationEmailTemplate(
  bonus: IBonus,
  employeeBonus: { employeeName: string; finalAmount: number },
  companyName: string
): EmailTemplate {
  return {
    subject: `${bonus.name} Credited | ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${emailBaseStyles}</head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header header-success">
              <div class="logo">HRZ<span>io</span></div>
              <div class="icon">🎉</div>
              <h1>${bonus.name}</h1>
              <p>Congratulations on your bonus!</p>
            </div>
            <div class="content">
              <p>Dear <strong>${employeeBonus.employeeName}</strong>,</p>
              <p>We are pleased to inform you that your <strong>${bonus.name}</strong> has been processed. Thank you for your hard work and dedication!</p>

              <div class="success-box">
                <div style="text-align: center;">
                  <span class="status-badge status-success">🎊 Bonus Credited</span>
                  <p style="color: #065f46; font-size: 14px; margin: 16px 0 8px 0;">Bonus Amount</p>
                  <div class="amount-large amount-success">₹${employeeBonus.finalAmount.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div class="highlight-box" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left-color: #10b981;">
                <p style="margin: 0; font-weight: 600; color: #065f46;">💰 Payment Info</p>
                <p style="margin: 8px 0 0 0; color: #047857;">This amount will be credited along with your salary for this month.</p>
              </div>

              <div class="card">
                <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">🌟 Keep Up the Great Work!</h3>
                <p style="margin: 0; color: #64748b;">Your contributions are valued and appreciated. We look forward to your continued success with us.</p>
              </div>

              <p>If you have any questions, please contact the HR department.</p>
            </div>
            <div class="footer">
              <div class="footer-logo">HRZ<span>io</span></div>
              <p><strong>${companyName}</strong></p>
              <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${bonus.name}\n\nDear ${employeeBonus.employeeName},\n\nYour ${bonus.name} of ₹${employeeBonus.finalAmount.toLocaleString('en-IN')} has been processed.\n\nBest Regards,\n${companyName}`
  };
}

// ================= Pending Approval Notifications =================

export function generatePendingApprovalEmailTemplate(
  approverName: string,
  pendingItems: Array<{ type: string; count: number }>,
  companyName: string
): EmailTemplate {
  const totalItems = pendingItems.reduce((sum, item) => sum + item.count, 0);

  return {
    subject: `${totalItems} Pending Approvals - Action Required | ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>${emailBaseStyles}</head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header header-warning">
              <div class="logo">HRZ<span>io</span></div>
              <div class="icon">📋</div>
              <h1>Pending Approvals</h1>
              <p>Items awaiting your review</p>
            </div>
            <div class="content">
              <p>Dear <strong>${approverName}</strong>,</p>
              <p>You have items pending that require your approval. Please review them at your earliest convenience.</p>

              <div class="card" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #fcd34d;">
                <div style="text-align: center;">
                  <span class="status-badge status-warning">⏳ Pending Review</span>
                  <p style="color: #92400e; font-size: 14px; margin: 16px 0 8px 0;">Total Items</p>
                  <p style="font-size: 48px; font-weight: 800; color: #b45309; margin: 0;">${totalItems}</p>
                </div>
              </div>

              <div class="card">
                <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">📝 Breakdown by Category</h3>
                <table>
                  ${pendingItems.map(item => `
                    <tr>
                      <td class="label">${item.type}</td>
                      <td class="value" style="color: #f59e0b; font-weight: 700;">${item.count} pending</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <div style="text-align: center;">
                <a href="#" class="btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">Review Now</a>
              </div>

              <div class="highlight-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #f59e0b;">
                <p style="margin: 0; font-weight: 600; color: #92400e;">⏰ Timely Action Required</p>
                <p style="margin: 8px 0 0 0; color: #b45309;">Pending approvals may impact employee payroll processing and other time-sensitive operations.</p>
              </div>

              <p>Please login to the HR portal to review and take action on these items.</p>
            </div>
            <div class="footer">
              <div class="footer-logo">HRZ<span>io</span></div>
              <p><strong>${companyName}</strong></p>
              <p style="margin-top: 20px; color: #94a3b8;">© ${new Date().getFullYear()} HRZio. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Pending Approvals\n\nDear ${approverName},\n\nYou have pending items requiring your approval.\n\n${pendingItems.map(item => `- ${item.count} ${item.type}`).join('\n')}\n\nBest Regards,\n${companyName}`
  };
}

// ================= Bulk Notification Functions =================

export async function sendBulkPayslipNotifications(
  paystubs: IPaystub[],
  employeeEmails: Record<string, string>,
  pdfBuffers: Record<string, Buffer>,
  companyName: string
): Promise<{ sent: number; failed: number; errors: Array<{ employeeId: string; error: string }> }> {
  let sent = 0;
  let failed = 0;
  const errors: Array<{ employeeId: string; error: string }> = [];

  for (const paystub of paystubs) {
    try {
      const email = employeeEmails[paystub.employeeId];
      const pdf = pdfBuffers[paystub.employeeId];

      if (!email || !pdf) {
        failed++;
        errors.push({ employeeId: paystub.employeeId, error: 'Missing email or PDF' });
        continue;
      }

      const result = await sendPayslipNotification(paystub, email, pdf, companyName);
      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({ employeeId: paystub.employeeId, error: result.error || 'Send failed' });
      }
    } catch (error) {
      failed++;
      errors.push({ employeeId: paystub.employeeId, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { sent, failed, errors };
}

export async function sendSalaryCreditSMS(
  employeePhone: string,
  employeeName: string,
  amount: number,
  month: string
): Promise<NotificationResult> {
  return sendSMS({
    type: 'sms',
    recipient: { id: '', phone: employeePhone },
    template: {
      subject: '',
      html: '',
      text: `Dear ${employeeName}, your salary of Rs.${amount.toLocaleString('en-IN')} for ${month} has been credited to your account.`
    }
  });
}
