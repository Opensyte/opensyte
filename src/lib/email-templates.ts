import { render } from "@react-email/render";
import { EarlyAccessInvitationEmail, EarlyAccessReminderEmail } from "~/emails";

interface EmailTemplateProps {
  code: string;
  recipientEmail: string;
  platformUrl?: string;
}

export async function getEarlyAccessInvitationTemplate({
  code,
  recipientEmail,
  platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://opensyte.com",
}: EmailTemplateProps) {
  const html = await render(
    EarlyAccessInvitationEmail({
      code,
      recipientEmail,
      platformUrl,
    })
  );

  return {
    subject: "Welcome to OpenSyte Early Access!",
    html,
  };
}

export async function getEarlyAccessReminderTemplate({
  code,
  recipientEmail,
  platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://opensyte.com",
}: EmailTemplateProps) {
  const html = await render(
    EarlyAccessReminderEmail({
      code,
      recipientEmail,
      platformUrl,
    })
  );

  return {
    subject: "Reminder: Your OpenSyte Early Access Invitation",
    html,
  };
}
