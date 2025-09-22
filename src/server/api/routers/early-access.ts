import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { isEarlyAccessEnabled } from "~/lib/early-access";

export const earlyAccessRouter = createTRPCRouter({
  // Validate registration code
  validateCode: publicProcedure
    .input(
      z.object({
        code: z
          .string()
          .min(1, "Registration code is required")
          .max(20, "Invalid code format"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isEarlyAccessEnabled()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Early access is not currently enabled",
        });
      }

      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to validate a registration code",
        });
      }

      // Find the registration code
      const earlyAccessCode = await ctx.db.earlyAccessCode.findUnique({
        where: { code: input.code.toUpperCase() },
      });

      if (!earlyAccessCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Invalid registration code. Please check your code and try again.",
        });
      }

      if (earlyAccessCode.isUsed) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This registration code has already been used.",
        });
      }

      // Check if the user's email matches the email associated with the code
      if (ctx.user.email !== earlyAccessCode.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "This registration code was issued for a different email address. Please use the account associated with the invitation.",
        });
      }

      // Mark code as used
      await ctx.db.earlyAccessCode.update({
        where: { id: earlyAccessCode.id },
        data: {
          isUsed: true,
          usedById: ctx.user.id,
          usedAt: new Date(),
        },
      });

      return {
        success: true,
        message:
          "Registration code validated successfully! You now have access to the platform.",
        email: earlyAccessCode.email,
      };
    }),

  // Check if user has valid early access
  checkAccess: publicProcedure.query(async ({ ctx }) => {
    // If early access is disabled, everyone has access
    if (!isEarlyAccessEnabled()) {
      return {
        hasAccess: true,
        reason: "early_access_disabled",
      };
    }

    // If user is not logged in, they need to log in first
    if (!ctx.user?.id) {
      return {
        hasAccess: false,
        reason: "not_authenticated",
      };
    }

    // Check if user has used a valid registration code (by user ID or email)
    const usedCode = await ctx.db.earlyAccessCode.findFirst({
      where: {
        OR: [
          {
            usedById: ctx.user.id,
            isUsed: true,
          },
          {
            email: ctx.user.email,
            isUsed: true,
          },
        ],
      },
    });

    if (usedCode) {
      return {
        hasAccess: true,
        reason: "valid_code_used",
        codeEmail: usedCode.email,
      };
    }

    return {
      hasAccess: false,
      reason: "no_valid_code",
    };
  }),

  // Get current user's early access status
  getMyStatus: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      return null;
    }

    const usedCode = await ctx.db.earlyAccessCode.findFirst({
      where: {
        OR: [
          {
            usedById: ctx.user.id,
            isUsed: true,
          },
          {
            email: ctx.user.email,
            isUsed: true,
          },
        ],
      },
      select: {
        id: true,
        email: true,
        code: true,
        usedAt: true,
        createdAt: true,
      },
    });

    return usedCode;
  }),
});
