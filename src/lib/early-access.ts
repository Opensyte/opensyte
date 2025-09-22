import { db } from "~/server/db";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";

/**
 * Generate a unique 8-character alphanumeric registration code
 */
export async function generateUniqueCode(): Promise<string> {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existingCode = await db.earlyAccessCode.findUnique({
      where: { code },
    });

    if (!existingCode) {
      return code;
    }

    attempts++;
  }

  throw new Error("Failed to generate unique code after maximum attempts");
}

/**
 * Check if a user email is in the admin emails list (server-side)
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) return false;

  const adminEmailList = adminEmails
    .split(",")
    .map(e => e.trim().toLowerCase());
  return adminEmailList.includes(email.toLowerCase());
}

/**
 * Check if early access is enabled (server-side)
 */
export function isEarlyAccessEnabled(): boolean {
  return process.env.ALLOW_EARLY_ACCESS === "true";
}

/**
 * Check if the current user has valid early access
 * This is a server-side utility function
 */
export async function checkUserEarlyAccess(): Promise<{
  hasAccess: boolean;
  reason: string;
  user?: { id: string; email: string };
}> {
  // If early access is disabled, everyone has access
  if (!isEarlyAccessEnabled()) {
    return {
      hasAccess: true,
      reason: "early_access_disabled",
    };
  }

  try {
    // Get the current session
    const session = await auth.api.getSession({ headers: await headers() });

    // If user is not logged in, they need to log in first
    if (!session?.user?.id) {
      return {
        hasAccess: false,
        reason: "not_authenticated",
      };
    }

    // Check if user has used a valid registration code (by user ID or email)
    const usedCode = await db.earlyAccessCode.findFirst({
      where: {
        OR: [
          {
            usedById: session.user.id,
            isUsed: true,
          },
          {
            email: session.user.email,
            isUsed: true,
          },
        ],
      },
    });

    if (usedCode) {
      return {
        hasAccess: true,
        reason: "valid_code_used",
        user: {
          id: session.user.id,
          email: session.user.email,
        },
      };
    }

    return {
      hasAccess: false,
      reason: "no_valid_code",
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    };
  } catch (error) {
    console.error("Error checking early access:", error);
    return {
      hasAccess: false,
      reason: "error",
    };
  }
}
