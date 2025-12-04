import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog';

interface SendEmailOptions {
  tenantId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  templateCode?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { tenantId, to, cc, bcc, subject, body, templateCode } = options;

    // Create log entry
    const emailLog = new EmailLog({
      tenantId,
      to,
      cc,
      bcc,
      subject,
      body,
      templateCode,
      status: 'pending',
      attempts: 0,
    });
    await emailLog.save();

    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        cc: cc?.join(', '),
        bcc: bcc?.join(', '),
        subject,
        html: body,
      });

      // Update log
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      emailLog.attempts += 1;
      await emailLog.save();

      console.log(`[Email Service] Email sent to ${to}, messageId: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error: unknown) {
      const err = error as Error;
      emailLog.status = 'failed';
      emailLog.error = err.message;
      emailLog.attempts += 1;
      await emailLog.save();

      console.error(`[Email Service] Failed to send email to ${to}:`, err.message);
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
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email.to,
          cc: email.cc?.join(', '),
          bcc: email.bcc?.join(', '),
          subject: email.subject,
          html: email.body,
        });

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
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }
}

export default new EmailService();
