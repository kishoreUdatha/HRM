import { Resend } from 'resend';
import EmailLog from '../models/EmailLog';

interface SendEmailOptions {
  tenantId: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  templateCode?: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class ResendService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'HRZIO <noreply@hrzio.com>';
    this.initializeResend();
  }

  private initializeResend(): void {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[ResendService] RESEND_API_KEY not configured, emails will fail');
      return;
    }
    this.resend = new Resend(apiKey);
  }

  private getResend(): Resend {
    if (!this.resend) {
      this.initializeResend();
      if (!this.resend) {
        throw new Error('Resend API key not configured');
      }
    }
    return this.resend;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const { tenantId, to, cc, bcc, subject, html, templateCode, replyTo } = options;
    const toAddresses = Array.isArray(to) ? to : [to];

    // Create log entry (skip if MongoDB not connected)
    let emailLog: any = null;
    try {
      emailLog = new EmailLog({
        tenantId,
        to: toAddresses[0],
        cc,
        bcc,
        subject,
        body: html,
        templateCode,
        status: 'pending',
        attempts: 0,
      });
      await emailLog.save();
    } catch (dbError) {
      console.warn('[ResendService] Email logging skipped (database not available)');
    }

    try {
      const { data, error } = await this.getResend().emails.send({
        from: this.fromEmail,
        to: toAddresses,
        cc,
        bcc,
        subject,
        html,
        replyTo,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update log
      if (emailLog) {
        try {
          emailLog.status = 'sent';
          emailLog.sentAt = new Date();
          emailLog.attempts += 1;
          await emailLog.save();
        } catch (dbError) {
          console.warn('[ResendService] Failed to update email log');
        }
      }

      console.log(`[ResendService] Email sent to ${toAddresses.join(', ')}, id: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (error: unknown) {
      const err = error as Error;
      if (emailLog) {
        try {
          emailLog.status = 'failed';
          emailLog.error = err.message;
          emailLog.attempts += 1;
          await emailLog.save();
        } catch (dbError) {
          console.warn('[ResendService] Failed to update email log');
        }
      }

      console.error(`[ResendService] Failed to send email to ${toAddresses.join(', ')}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  async retryFailedEmails(): Promise<{ processed: number; success: number }> {
    const failedEmails = await EmailLog.find({
      status: 'failed',
      attempts: { $lt: 3 },
    }).limit(100);

    let success = 0;

    for (const email of failedEmails) {
      try {
        const { error } = await this.getResend().emails.send({
          from: this.fromEmail,
          to: [email.to],
          cc: email.cc,
          bcc: email.bcc,
          subject: email.subject,
          html: email.body,
        });

        if (error) {
          throw new Error(error.message);
        }

        email.status = 'sent';
        email.sentAt = new Date();
        success++;
      } catch (error: unknown) {
        const err = error as Error;
        email.error = err.message;
      }

      email.attempts += 1;
      await email.save();
    }

    return { processed: failedEmails.length, success };
  }

  parseTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
  }
}

export default new ResendService();
