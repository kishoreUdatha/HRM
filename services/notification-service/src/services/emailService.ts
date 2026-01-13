import resendService from './resendService';

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
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { tenantId, to, cc, bcc, subject, body, templateCode } = options;

    return resendService.sendEmail({
      tenantId,
      to,
      cc,
      bcc,
      subject,
      html: body,
      templateCode,
    });
  }

  async retryFailedEmails(): Promise<{ processed: number; success: number }> {
    return resendService.retryFailedEmails();
  }

  parseTemplate(template: string, variables: Record<string, string>): string {
    return resendService.parseTemplate(template, variables);
  }
}

export default new EmailService();
