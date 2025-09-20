import { Resend } from "resend";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

export interface SendShareInvitationOptions {
  recipientEmail: string;
  recipientName?: string;
  shareUrl: string;
  templateName: string;
  organizationName: string;
  senderName?: string;
  expiresAt?: Date;
  message?: string;
}

export class EmailService {
  /**
   * Send a template share invitation email
   */
  static async sendShareInvitation(options: SendShareInvitationOptions) {
    const {
      recipientEmail,
      recipientName,
      shareUrl,
      templateName,
      organizationName,
      senderName,
      expiresAt,
      message,
    } = options;

    const subject = `${organizationName} shared a template with you: ${templateName}`;

    const expirationText = expiresAt
      ? `This invitation expires on ${expiresAt.toLocaleDateString()}.`
      : "";

    const personalMessage = message
      ? `\n\nMessage from ${senderName ?? organizationName}:\n"${message}"`
      : "";

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Template Shared with You</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 16px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: 700;
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
      border: 3px solid rgba(255, 255, 255, 0.2);
      text-align: center;
      line-height: 1;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px;
    }
    .subtitle {
      color: #6b7280;
      margin: 0;
    }
    .template-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .template-name {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px;
    }
    .organization {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 32px 0;
      text-align: center;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      border: none;
      transition: all 0.2s ease;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
    }
    .message {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
    }
    .message-title {
      font-weight: 600;
      color: #92400e;
      margin: 0 0 8px;
    }
    .message-content {
      color: #92400e;
      margin: 0;
      font-style: italic;
    }
    .security-info {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
    }
    .security-title {
      font-weight: 600;
      color: #0369a1;
      margin: 0 0 8px;
    }
    .security-list {
      color: #0369a1;
      margin: 0;
      padding-left: 20px;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .expiration {
      color: #dc2626;
      font-weight: 600;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo" style="width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 700; box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3); border: 3px solid rgba(255, 255, 255, 0.2); text-align: center; line-height: 1;">📦</div>
      <h1 class="title">Template Shared with You</h1>
      <p class="subtitle">You've been invited to access a template package</p>
    </div>

    <p>Hello${recipientName ? ` ${recipientName}` : ""},</p>
    
    <p><strong>${organizationName}</strong> has shared a template package with you on OpenSyte.</p>

    <div class="template-card">
      <h3 class="template-name">${templateName}</h3>
      <p class="organization">Shared by ${organizationName}</p>
    </div>

    ${
      personalMessage
        ? `
    <div class="message">
      <p class="message-title">Personal Message:</p>
      <p class="message-content">${message}</p>
    </div>
    `
        : ""
    }

    <div style="text-align: center; margin: 32px 0;">
      <a href="${shareUrl}" class="cta-button" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white !important; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); display: inline-block;">🚀 View Template Package</a>
    </div>

    ${expirationText ? `<p class="expiration">${expirationText}</p>` : ""}

    <div class="security-info">
      <p class="security-title">🔒 Security Information:</p>
      <ul class="security-list">
        <li>This is a secure, tracked link</li>
        <li>You can preview the template before importing</li>
        <li>Only you can access this specific invitation</li>
        <li>The template will be safely imported to your organization</li>
      </ul>
    </div>

    <p>This template package contains pre-configured workflows, reports, and other assets that you can import and customize for your organization.</p>

    <div class="footer">
      <p>This email was sent by OpenSyte on behalf of ${organizationName}.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

    try {
      const result = await resend.emails.send({
        from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
        to: recipientEmail,
        subject,
        html: emailContent,
        // Add fallback text content
        text: `
${organizationName} shared a template with you: ${templateName}

Hello${recipientName ? ` ${recipientName}` : ""},

${organizationName} has shared a template package with you on OpenSyte.

Template: ${templateName}
Shared by: ${organizationName}

${personalMessage}

View the template package: ${shareUrl}

${expirationText}

This template package contains pre-configured workflows, reports, and other assets that you can import and customize for your organization.

---
This email was sent by OpenSyte on behalf of ${organizationName}.
If you didn't expect this invitation, you can safely ignore this email.
        `.trim(),
      });

      return result;
    } catch (error) {
      console.error("Failed to send share invitation email:", error);
      throw new Error("Failed to send email invitation");
    }
  }

  /**
   * Send a batch of share invitation emails
   */
  static async sendBatchShareInvitations(
    invitations: SendShareInvitationOptions[]
  ) {
    const results = await Promise.allSettled(
      invitations.map(invitation => this.sendShareInvitation(invitation))
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return {
      successful,
      failed,
      total: invitations.length,
      results,
    };
  }
}
