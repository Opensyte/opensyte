/**
 * Email Service - Handles email sending via Resend
 */

import { Resend, type CreateEmailOptions } from "resend";
import { env } from "~/env";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  /**
   * Send email via Resend
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const fromName = options.fromName ?? env.RESEND_FROM_NAME;
      const fromEmail = options.fromEmail ?? env.RESEND_FROM_EMAIL;
      const from = `${fromName} <${fromEmail}>`;

      const derivedText =
        options.textBody ??
        (options.htmlBody
          ? options.htmlBody
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
          : options.subject);

      const emailOptions: CreateEmailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        text: derivedText,
        ...(options.replyTo && { replyTo: options.replyTo }),
        ...(options.cc && { cc: options.cc }),
        ...(options.bcc && { bcc: options.bcc }),
        ...(options.htmlBody && { html: options.htmlBody }),
        ...(options.attachments && {
          attachments: options.attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            content_type: att.contentType,
          })),
        }),
      };

      const result = await this.resend.emails.send(emailOptions);

      if (result.error) {
        console.error("Resend API error:", result.error);
        return {
          success: false,
          error: result.error.message,
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error("Email service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => this.sendEmail(email));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: `Batch email ${i + index} failed: ${result.reason}`,
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Validate email configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Test email sending with a simple verification
      const testResult = await this.resend.emails.send({
        from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
        to: [env.RESEND_FROM_EMAIL], // Send to self for testing
        subject: "OpenSyte Email Service Test",
        html: "<p>This is a test email to validate the email service configuration.</p>",
      });

      if (testResult.error) {
        return {
          valid: false,
          error: testResult.error.message,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Configuration test failed",
      };
    }
  }
}
