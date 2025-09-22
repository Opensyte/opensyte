import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  generateUniqueCode,
  isAdminEmail,
  isEarlyAccessEnabled,
} from "~/lib/early-access";
import { render } from "@react-email/render";
import { EarlyAccessInvitationEmail, EarlyAccessReminderEmail } from "~/emails";
import { Resend } from "resend";
import { env } from "~/env";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Get the platform URL from request headers
 * Handles custom domains, CNAMEs, and development environments
 */
function getPlatformUrl(headers: Headers): string {
  // Get the host from headers
  const host = headers.get("host");
  const protocol =
    headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (!host) {
    // Fallback to environment variable or default
    return env.BETTER_AUTH_URL ?? "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}

// Admin procedure that checks if user is an admin
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user?.email) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access admin features",
    });
  }

  // Check if early access is enabled
  if (!isEarlyAccessEnabled()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Admin features are not available when early access is disabled.",
    });
  }

  if (!isAdminEmail(ctx.user.email)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied. Admin privileges required.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminRouter = createTRPCRouter({
  // Get all early access codes
  getEarlyAccessCodes: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.earlyAccessCode.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  // Add new early access user
  addEarlyAccessUser: adminProcedure
    .input(
      z.object({
        email: z.string().email("Please enter a valid email address"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists
      const existingCode = await ctx.db.earlyAccessCode.findUnique({
        where: { email: input.email },
      });

      if (existingCode) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This email already has an early access invitation",
        });
      }

      // Generate unique code
      const code = await generateUniqueCode();

      // Create early access record
      const earlyAccessCode = await ctx.db.earlyAccessCode.create({
        data: {
          email: input.email,
          code,
        },
      });

      // Send invitation email
      try {
        const platformUrl = getPlatformUrl(ctx.headers);

        console.log("Rendering email with props:", {
          code,
          recipientEmail: input.email,
          platformUrl,
        });

        const emailComponent = EarlyAccessInvitationEmail({
          code,
          recipientEmail: input.email,
          platformUrl,
        });

        const emailHtml = await render(emailComponent);

        // Ensure we have a string
        const htmlString =
          typeof emailHtml === "string" ? emailHtml : String(emailHtml);

        console.log(
          "Email HTML rendered, type:",
          typeof htmlString,
          "length:",
          htmlString.length
        );
        console.log(
          "Sending email from:",
          `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`
        );
        console.log("Sending email to:", input.email);

        const result = await resend.emails.send({
          from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
          to: input.email,
          subject: "Your Early Access Invitation to OpenSyte",
          html: htmlString,
        });

        console.log("Email send result:", result);
      } catch (error) {
        // If email fails, delete the created record and throw error
        await ctx.db.earlyAccessCode.delete({
          where: { id: earlyAccessCode.id },
        });

        console.error("Failed to send invitation email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation email. Please try again.",
        });
      }

      return {
        success: true,
        message: "Invitation sent successfully",
        code: earlyAccessCode,
      };
    }),

  // Resend invitation
  resendInvitation: adminProcedure
    .input(
      z.object({
        id: z.string().cuid("Invalid early access code ID"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the early access code
      const earlyAccessCode = await ctx.db.earlyAccessCode.findUnique({
        where: { id: input.id },
      });

      if (!earlyAccessCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Early access code not found",
        });
      }

      if (earlyAccessCode.isUsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot resend invitation for a code that has already been used",
        });
      }

      // Resend invitation email
      try {
        const platformUrl = getPlatformUrl(ctx.headers);

        console.log("Rendering reminder email with props:", {
          code: earlyAccessCode.code,
          recipientEmail: earlyAccessCode.email,
          platformUrl,
        });

        const emailComponent = EarlyAccessReminderEmail({
          code: earlyAccessCode.code,
          recipientEmail: earlyAccessCode.email,
          platformUrl,
        });

        const emailHtml = await render(emailComponent);

        // Ensure we have a string
        const htmlString =
          typeof emailHtml === "string" ? emailHtml : String(emailHtml);

        console.log(
          "Reminder email HTML rendered, type:",
          typeof htmlString,
          "length:",
          htmlString.length
        );

        const result = await resend.emails.send({
          from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
          to: earlyAccessCode.email,
          subject: "Reminder: Your OpenSyte Early Access Invitation",
          html: htmlString,
        });

        console.log("Reminder email send result:", result);

        return {
          success: true,
          message: "Invitation resent successfully",
        };
      } catch (error) {
        console.error("Failed to resend invitation email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resend invitation email. Please try again.",
        });
      }
    }),

  // Revoke early access for a user
  revokeEarlyAccess: adminProcedure
    .input(
      z.object({
        id: z.string().cuid("Invalid early access code ID"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the early access code
      const earlyAccessCode = await ctx.db.earlyAccessCode.findUnique({
        where: { id: input.id },
      });

      if (!earlyAccessCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Early access code not found",
        });
      }

      // Delete the early access code (this revokes access)
      await ctx.db.earlyAccessCode.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: `Early access revoked for ${earlyAccessCode.email}`,
        revokedEmail: earlyAccessCode.email,
      };
    }),

  // Check if current user is admin
  isAdmin: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.email) {
      return false;
    }

    // According to requirements: Admin dashboard should only be shown when
    // ALLOW_EARLY_ACCESS=true AND user's email is in admin emails list
    return isEarlyAccessEnabled() && isAdminEmail(ctx.user.email);
  }),
});
