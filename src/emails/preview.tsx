/**
 * Email Preview Component
 * This file can be used to preview emails during development
 */

import { render } from "@react-email/render";
import { EarlyAccessInvitationEmail, EarlyAccessReminderEmail } from "./index";

// Preview props for testing
const previewProps = {
  code: "PREVIEW123",
  recipientEmail: "user@example.com",
  platformUrl: "https://opensyte.com",
};

// Generate HTML for both email templates
export const generateInvitationPreview = async () => {
  return await render(EarlyAccessInvitationEmail(previewProps));
};

export const generateReminderPreview = async () => {
  return await render(EarlyAccessReminderEmail(previewProps));
};

// Console log the HTML for debugging (optional)
if (typeof window === "undefined") {
  generateInvitationPreview()
    .then(html => {
      console.log("=== Early Access Invitation Email Preview ===");
      console.log(html.substring(0, 200) + "...");
    })
    .catch(error => {
      console.error("Error generating invitation preview:", error);
    });

  generateReminderPreview()
    .then(html => {
      console.log("\n=== Early Access Reminder Email Preview ===");
      console.log(html.substring(0, 200) + "...");
    })
    .catch(error => {
      console.error("Error generating reminder preview:", error);
    });
}
