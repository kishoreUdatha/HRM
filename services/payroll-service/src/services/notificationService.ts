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
    subject: `Your Payslip for ${monthName} ${paystub.payPeriod.year} - ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payslip - ${monthName} ${paystub.payPeriod.year}</h2>
        <p>Dear ${paystub.employeeDetails.name},</p>
        <p>Your payslip for ${monthName} ${paystub.payPeriod.year} is now available.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Pay Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;">Gross Earnings:</td>
              <td style="text-align: right; font-weight: bold;">₹${paystub.summary.grossEarnings.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Total Deductions:</td>
              <td style="text-align: right; font-weight: bold;">₹${paystub.summary.totalDeductions.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-top: 2px solid #ddd;">
              <td style="padding: 12px 0; font-size: 18px;">Net Pay:</td>
              <td style="text-align: right; font-weight: bold; font-size: 18px; color: #2e7d32;">₹${paystub.summary.netPay.toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>

        <p>Please find the detailed payslip attached to this email.</p>
        <p>If you have any questions regarding your payslip, please contact the HR department.</p>

        <p style="margin-top: 30px;">Best Regards,<br>${companyName}</p>

        <p style="color: #888; font-size: 12px; margin-top: 40px;">
          This is an automated email. Please do not reply directly to this message.
        </p>
      </div>
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

  return {
    subject: `${revisionTypeText[revision.revisionType]} Notification - ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${revisionTypeText[revision.revisionType]} Notification</h2>
        <p>Dear ${employeeName},</p>
        <p>We are pleased to inform you about your ${revisionTypeText[revision.revisionType].toLowerCase()}.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Revised Compensation</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <th style="text-align: left; padding: 8px 0;">Component</th>
              <th style="text-align: right; padding: 8px 0;">Previous</th>
              <th style="text-align: right; padding: 8px 0;">New</th>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Basic Salary</td>
              <td style="text-align: right;">₹${revision.previousSalary.basic.toLocaleString('en-IN')}</td>
              <td style="text-align: right; color: #2e7d32;">₹${revision.newSalary.basic.toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Gross Salary</td>
              <td style="text-align: right;">₹${revision.previousSalary.gross.toLocaleString('en-IN')}</td>
              <td style="text-align: right; color: #2e7d32;">₹${revision.newSalary.gross.toLocaleString('en-IN')}</td>
            </tr>
            <tr style="border-top: 2px solid #ddd;">
              <td style="padding: 12px 0; font-weight: bold;">CTC</td>
              <td style="text-align: right; font-weight: bold;">₹${revision.previousSalary.ctc.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-weight: bold; color: #2e7d32;">₹${revision.newSalary.ctc.toLocaleString('en-IN')}</td>
            </tr>
          </table>
          <p style="margin-top: 15px; font-weight: bold;">
            Increment: ₹${revision.incrementAmount.toLocaleString('en-IN')} (${revision.incrementPercentage}%)
          </p>
          <p>Effective Date: ${new Date(revision.effectiveDate).toLocaleDateString('en-IN')}</p>
        </div>

        <p>Congratulations on your ${revisionTypeText[revision.revisionType].toLowerCase()}!</p>

        <p style="margin-top: 30px;">Best Regards,<br>${companyName}</p>
      </div>
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
      subject: `Loan Application Approved - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2e7d32;">Loan Application Approved</h2>
          <p>Dear ${employeeName},</p>
          <p>Your loan application has been approved.</p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Loan Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0;">Loan Number:</td><td style="text-align: right;">${loan.loanNumber}</td></tr>
              <tr><td style="padding: 8px 0;">Loan Type:</td><td style="text-align: right;">${loan.loanType.replace('_', ' ')}</td></tr>
              <tr><td style="padding: 8px 0;">Principal Amount:</td><td style="text-align: right;">₹${loan.principalAmount.toLocaleString('en-IN')}</td></tr>
              <tr><td style="padding: 8px 0;">EMI Amount:</td><td style="text-align: right;">₹${loan.emiAmount.toLocaleString('en-IN')}</td></tr>
              <tr><td style="padding: 8px 0;">Tenure:</td><td style="text-align: right;">${loan.tenure} ${loan.tenureType}</td></tr>
            </table>
          </div>

          <p>The loan amount will be disbursed as per the company policy.</p>

          <p style="margin-top: 30px;">Best Regards,<br>${companyName}</p>
        </div>
      `,
      text: `Loan Application Approved\n\nDear ${employeeName},\n\nYour loan application (${loan.loanNumber}) for ₹${loan.principalAmount.toLocaleString('en-IN')} has been approved.\n\nEMI: ₹${loan.emiAmount.toLocaleString('en-IN')}\nTenure: ${loan.tenure} ${loan.tenureType}\n\nBest Regards,\n${companyName}`
    };
  } else {
    return {
      subject: `Loan Application Update - ${companyName}`,
      html: `<div style="font-family: Arial, sans-serif;"><h2>Loan Application Update</h2><p>Dear ${employeeName},</p><p>We regret to inform you that your loan application (${loan.loanNumber}) could not be approved at this time. Please contact HR for more details.</p><p>Best Regards,<br>${companyName}</p></div>`,
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

  return {
    subject: `Reimbursement ${statusText[reimbursement.status as keyof typeof statusText] || 'Update'} - ${reimbursement.claimNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reimbursement ${statusText[reimbursement.status as keyof typeof statusText] || 'Update'}</h2>
        <p>Dear ${employeeName},</p>
        <p>Your reimbursement claim has been updated.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;">Claim Number:</td><td style="text-align: right;">${reimbursement.claimNumber}</td></tr>
            <tr><td style="padding: 8px 0;">Claim Type:</td><td style="text-align: right;">${reimbursement.claimType}</td></tr>
            <tr><td style="padding: 8px 0;">Claimed Amount:</td><td style="text-align: right;">₹${reimbursement.totalClaimedAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 8px 0;">Approved Amount:</td><td style="text-align: right; color: #2e7d32;">₹${reimbursement.totalApprovedAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 8px 0;">Status:</td><td style="text-align: right; font-weight: bold;">${statusText[reimbursement.status as keyof typeof statusText] || reimbursement.status}</td></tr>
          </table>
        </div>

        <p style="margin-top: 30px;">Best Regards,<br>${companyName}</p>
      </div>
    `,
    text: `Reimbursement ${statusText[reimbursement.status as keyof typeof statusText] || 'Update'}\n\nClaim: ${reimbursement.claimNumber}\nClaimed: ₹${reimbursement.totalClaimedAmount}\nApproved: ₹${reimbursement.totalApprovedAmount}\n\nBest Regards,\n${companyName}`
  };
}

// ================= Bonus Notifications =================

export function generateBonusNotificationEmailTemplate(
  bonus: IBonus,
  employeeBonus: { employeeName: string; finalAmount: number },
  companyName: string
): EmailTemplate {
  return {
    subject: `${bonus.name} Credited - ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">🎉 ${bonus.name}</h2>
        <p>Dear ${employeeBonus.employeeName},</p>
        <p>We are pleased to inform you that your ${bonus.name} has been processed.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #666;">Bonus Amount</p>
          <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: #2e7d32;">₹${employeeBonus.finalAmount.toLocaleString('en-IN')}</p>
        </div>

        <p>This amount will be credited along with your salary for this month.</p>

        <p style="margin-top: 30px;">Best Regards,<br>${companyName}</p>
      </div>
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
  const itemsList = pendingItems.map(item => `<li>${item.count} ${item.type}</li>`).join('');

  return {
    subject: `Pending Approvals - Action Required - ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pending Approvals</h2>
        <p>Dear ${approverName},</p>
        <p>You have pending items requiring your approval:</p>

        <ul style="background: #f5f5f5; padding: 20px 40px; border-radius: 8px; margin: 20px 0;">
          ${itemsList}
        </ul>

        <p>Please login to the HR portal to review and take action.</p>

        <p style="margin-top: 30px;">Best Regards,<br>${companyName}</p>
      </div>
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
