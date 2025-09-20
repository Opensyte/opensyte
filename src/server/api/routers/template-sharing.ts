import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
  publicProcedure,
} from "../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import {
  ShareTokenService,
  SnapshotService,
  ShareAccessService,
  ShareAuditService,
  ShareEmailService,
  CreateShareInputSchema,
  SHARE_CONFIG,
  type ShareSnapshot,
} from "~/lib/template-sharing";
import { EmailService } from "~/server/email/template-sharing";
import type {
  TemplateShareStatus,
  TemplateShareAccessStatus,
} from "@prisma/client";
import { TemplateManifestSchema } from "~/types/templates";

// Helper function to convert values to Prisma InputJsonValue
const toInputJson = <T>(v: T): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v)) as unknown as Prisma.InputJsonValue;

// Helper function to create audit log entry with proper type conversion
const createAuditLogEntry = (
  shareId: string,
  action: "PREVIEW" | "IMPORT" | "DOWNLOAD",
  status:
    | "SUCCESS"
    | "BLOCKED"
    | "EXPIRED"
    | "REVOKED"
    | "EXHAUSTED"
    | "INVALID"
    | "ERROR",
  options: {
    recipientEmail?: string;
    userAgent?: string;
    ipAddress?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  } = {}
) => {
  const baseEntry = ShareAuditService.createLogEntry(
    shareId,
    action,
    status,
    options
  );
  return {
    ...baseEntry,
    metadata: baseEntry.metadata ? toInputJson(baseEntry.metadata) : undefined,
  };
};

/**
 * Template Sharing Router
 * Handles all template package sharing functionality including:
 * - Creating and managing shares
 * - Public preview access
 * - Import operations
 * - Audit logging
 */
export const templateSharingRouter = createTRPCRouter({
  // ==================== SHARE CREATION ====================

  /**
   * Create a new template share
   */
  createShare: createPermissionProcedure(PERMISSIONS.TEMPLATES_SHARE)
    .input(CreateShareInputSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      // Verify template package exists and user has access
      const templatePackage = await db.templatePackage.findFirst({
        where: {
          id: input.templatePackageId,
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      });

      if (!templatePackage) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template package not found or access denied",
        });
      }

      // Parse and validate manifest
      const manifestResult = TemplateManifestSchema.safeParse(
        templatePackage.manifest
      );
      if (!manifestResult.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid template manifest",
        });
      }

      // Generate token for link-based shares
      let rawToken: string | null = null;
      let tokenHash: string | null = null;

      if (input.shareMode === "LINK" || input.shareMode === "MIXED") {
        rawToken = ShareTokenService.generateToken();
        tokenHash = ShareTokenService.hashToken(rawToken);
      }

      // Create snapshot
      const snapshot = SnapshotService.createSnapshot(
        templatePackage,
        manifestResult.data
      );

      // Validate expiration date
      if (input.expiresAt) {
        const now = new Date();
        const maxExpiration = new Date(
          now.getTime() + SHARE_CONFIG.MAX_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
        );

        if (input.expiresAt <= now) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Expiration date must be in the future",
          });
        }

        if (input.expiresAt > maxExpiration) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Expiration date cannot exceed ${SHARE_CONFIG.MAX_EXPIRATION_DAYS} days`,
          });
        }
      }

      // Create share record
      const share = await db.templateShare.create({
        data: {
          templatePackageId: input.templatePackageId,
          organizationId: input.organizationId,
          name: input.name,
          shareMode: input.shareMode,
          tokenHash,
          expiresAt: input.expiresAt,
          maxUses: input.maxUses,
          notes: input.notes,
          snapshotData: toInputJson(snapshot),
          snapshotVersion: SHARE_CONFIG.SNAPSHOT_VERSION,
          createdById: ctx.user.id,
        },
      });

      // Create recipient records for email shares
      if (
        (input.shareMode === "EMAIL" || input.shareMode === "MIXED") &&
        input.recipientEmails
      ) {
        await db.templateShareRecipient.createMany({
          data: input.recipientEmails.map(email => ({
            shareId: share.id,
            email: email.toLowerCase(),
          })),
        });

        // Send email invitations
        try {
          // Ensure we have a proper base URL with protocol
          const baseUrl = process.env.NEXTAUTH_URL?.startsWith("http")
            ? process.env.NEXTAUTH_URL
            : `https://${process.env.NEXTAUTH_URL ?? "localhost:3000"}`;

          const shareUrl = rawToken
            ? ShareTokenService.generateShareUrl(baseUrl, rawToken)
            : `${baseUrl}/shared/templates/${share.id}`;

          // Validate email addresses
          console.log("Input recipientEmails:", input.recipientEmails);
          const { valid: validEmails, invalid: invalidEmails } =
            ShareEmailService.validateEmailAddresses(input.recipientEmails);

          console.log("Valid emails:", validEmails);
          console.log("Invalid emails:", invalidEmails);

          if (invalidEmails.length > 0) {
            console.warn("Invalid email addresses:", invalidEmails);
          }

          if (validEmails.length > 0) {
            // Send email invitations
            const emailPromises = validEmails.map(email =>
              EmailService.sendShareInvitation({
                recipientEmail: email,
                shareUrl,
                templateName: templatePackage.name,
                organizationName:
                  templatePackage.organization?.name ?? "Unknown Organization",
                senderName: ctx.user.name ?? undefined,
                expiresAt: input.expiresAt ?? undefined,
                message: input.notes ?? undefined,
              })
            );

            const emailResults = await Promise.allSettled(emailPromises);

            // Log email sending results
            emailResults.forEach((result, index) => {
              if (result.status === "fulfilled") {
                console.log(`Email sent successfully to ${validEmails[index]}`);
              } else {
                console.error(
                  `Failed to send email to ${validEmails[index]}:`,
                  result.reason
                );
              }
            });

            const successfulEmails = emailResults.filter(
              r => r.status === "fulfilled"
            ).length;
            const failedEmails = emailResults.filter(
              r => r.status === "rejected"
            ).length;

            // Log email sending summary
            await db.templateShareAccessLog.create({
              data: createAuditLogEntry(share.id, "PREVIEW", "SUCCESS", {
                metadata: {
                  action: "emails_sent",
                  successful: successfulEmails,
                  failed: failedEmails,
                  total: validEmails.length,
                  createdBy: ctx.user.id,
                },
              }),
            });
          }
        } catch (error) {
          console.error("Error sending email invitations:", error);
          // Don't fail the entire request if emails fail
          await db.templateShareAccessLog.create({
            data: createAuditLogEntry(share.id, "PREVIEW", "INVALID", {
              errorMessage: "Failed to send email invitations",
              metadata: { action: "email_send_error", createdBy: ctx.user.id },
            }),
          });
        }
      }

      // Log the creation
      await db.templateShareAccessLog.create({
        data: createAuditLogEntry(share.id, "PREVIEW", "SUCCESS", {
          metadata: { action: "share_created", createdBy: ctx.user.id },
        }),
      });

      // Ensure we have a proper base URL with protocol for the return value
      const returnBaseUrl = process.env.NEXTAUTH_URL?.startsWith("http")
        ? process.env.NEXTAUTH_URL
        : `https://${process.env.NEXTAUTH_URL ?? "localhost:3000"}`;

      return {
        shareId: share.id,
        token: rawToken, // Only returned once for security
        shareUrl: rawToken
          ? ShareTokenService.generateShareUrl(returnBaseUrl, rawToken)
          : null,
      };
    }),

  // ==================== SHARE MANAGEMENT ====================

  /**
   * List shares for an organization
   */
  listShares: createAnyPermissionProcedure([
    PERMISSIONS.TEMPLATES_SHARE,
    PERMISSIONS.TEMPLATES_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
        templatePackageId: z.string().cuid().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const shares = await db.templateShare.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.templatePackageId && {
            templatePackageId: input.templatePackageId,
          }),
        },
        include: {
          templatePackage: {
            select: {
              id: true,
              name: true,
              version: true,
            },
          },
          recipients: {
            select: {
              email: true,
              status: true,
              invitedAt: true,
              viewedAt: true,
              importedAt: true,
            },
          },
          _count: {
            select: {
              accessLogs: true,
              imports: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      // Compute current status for each share
      const sharesWithStatus = shares.map(share => {
        const statusInfo = ShareAccessService.computeShareStatus(share);

        return {
          ...share,
          currentStatus: statusInfo,
          snapshotData: undefined, // Don't return full snapshot in list
        };
      });

      const total = await db.templateShare.count({
        where: {
          organizationId: input.organizationId,
          ...(input.templatePackageId && {
            templatePackageId: input.templatePackageId,
          }),
        },
      });

      return {
        shares: sharesWithStatus,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get detailed share information
   */
  getShareDetails: createAnyPermissionProcedure([
    PERMISSIONS.TEMPLATES_SHARE,
    PERMISSIONS.TEMPLATES_ADMIN,
  ])
    .input(
      z.object({
        shareId: z.string().cuid(),
        organizationId: z.string().cuid(),
        includeAuditLog: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const share = await db.templateShare.findFirst({
        where: {
          id: input.shareId,
          organizationId: input.organizationId,
        },
        include: {
          templatePackage: {
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              category: true,
              iconUrl: true,
              tags: true,
            },
          },
          recipients: {
            select: {
              id: true,
              email: true,
              status: true,
              invitedAt: true,
              viewedAt: true,
              importedAt: true,
            },
          },
          imports: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: { importedAt: "desc" },
          },
          ...(input.includeAuditLog && {
            accessLogs: {
              orderBy: { createdAt: "desc" },
              take: 100,
            },
          }),
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      const statusInfo = ShareAccessService.computeShareStatus(share);
      const snapshot = share.snapshotData as unknown as ShareSnapshot;

      return {
        ...share,
        currentStatus: statusInfo,
        snapshot: SnapshotService.validateSnapshot(snapshot) ? snapshot : null,
      };
    }),

  /**
   * Revoke a share
   */
  revokeShare: createPermissionProcedure(PERMISSIONS.TEMPLATES_SHARE)
    .input(
      z.object({
        shareId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const share = await db.templateShare.findFirst({
        where: {
          id: input.shareId,
          organizationId: input.organizationId,
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      if (share.status === "REVOKED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Share is already revoked",
        });
      }

      // Update share status
      await db.templateShare.update({
        where: { id: input.shareId },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedById: ctx.user.id,
        },
      });

      // Log the revocation
      await db.templateShareAccessLog.create({
        data: createAuditLogEntry(share.id, "PREVIEW", "REVOKED", {
          metadata: { action: "share_revoked", revokedBy: ctx.user.id },
        }),
      });

      return { success: true };
    }),

  // ==================== PUBLIC ACCESS ====================

  /**
   * Get share preview by token (public endpoint)
   */
  getShareByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input, ctx }) => {
      const tokenHash = ShareTokenService.hashToken(input.token);

      const share = await db.templateShare.findFirst({
        where: {
          tokenHash,
          shareMode: { in: ["LINK", "MIXED"] },
        },
        include: {
          templatePackage: {
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              category: true,
              iconUrl: true,
              tags: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      });

      if (!share) {
        // Log invalid access attempt
        await db.templateShareAccessLog.create({
          data: ShareAuditService.createLogEntry("", "PREVIEW", "INVALID", {
            metadata: { invalidToken: input.token.substring(0, 8) + "..." },
          }),
        });

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found or invalid token",
        });
      }

      const statusInfo = ShareAccessService.computeShareStatus(share);
      const snapshot = share.snapshotData as unknown as ShareSnapshot;

      // Log the access
      await db.templateShareAccessLog.create({
        data: ShareAuditService.createLogEntry(share.id, "PREVIEW", "SUCCESS", {
          userAgent: ctx.headers?.get("user-agent") ?? undefined,
          metadata: { accessMethod: "token" },
        }),
      });

      // Update last accessed timestamp
      await db.templateShare.update({
        where: { id: share.id },
        data: { lastAccessedAt: new Date() },
      });

      return {
        share: {
          id: share.id,
          name: share.name,
          templatePackage: share.templatePackage,
          organization: share.organization,
          createdAt: share.createdAt,
        },
        status: statusInfo,
        preview: SnapshotService.validateSnapshot(snapshot)
          ? SnapshotService.extractPreviewData(snapshot)
          : null,
      };
    }),

  /**
   * Get share preview by email invitation (public endpoint)
   */
  getShareByEmail: publicProcedure
    .input(
      z.object({
        shareId: z.string().cuid(),
        email: z.string().email(),
      })
    )
    .query(async ({ input, ctx }) => {
      const share = await db.templateShare.findFirst({
        where: {
          id: input.shareId,
          shareMode: { in: ["EMAIL", "MIXED"] },
        },
        include: {
          templatePackage: {
            select: {
              id: true,
              name: true,
              description: true,
              version: true,
              category: true,
              iconUrl: true,
              tags: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
          recipients: true,
        },
      });

      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      // Validate email access
      const emailAccess = ShareAccessService.validateEmailAccess(
        share,
        input.email
      );
      if (!emailAccess.allowed) {
        // Log blocked access
        await db.templateShareAccessLog.create({
          data: ShareAuditService.createLogEntry(
            share.id,
            "PREVIEW",
            "BLOCKED",
            {
              recipientEmail: input.email,
              errorMessage: emailAccess.reason,
            }
          ),
        });

        throw new TRPCError({
          code: "FORBIDDEN",
          message: emailAccess.reason ?? "Access denied",
        });
      }

      const statusInfo = ShareAccessService.computeShareStatus(share);
      const snapshot = share.snapshotData as unknown as ShareSnapshot;

      // Update recipient status
      await db.templateShareRecipient.updateMany({
        where: {
          shareId: share.id,
          email: input.email.toLowerCase(),
          status: "PENDING",
        },
        data: {
          status: "VIEWED",
          viewedAt: new Date(),
        },
      });

      // Log the access
      await db.templateShareAccessLog.create({
        data: ShareAuditService.createLogEntry(share.id, "PREVIEW", "SUCCESS", {
          recipientEmail: input.email,
          userAgent: ctx.headers?.get("user-agent") ?? undefined,
          metadata: { accessMethod: "email" },
        }),
      });

      // Update last accessed timestamp
      await db.templateShare.update({
        where: { id: share.id },
        data: { lastAccessedAt: new Date() },
      });

      return {
        share: {
          id: share.id,
          name: share.name,
          templatePackage: share.templatePackage,
          organization: share.organization,
          createdAt: share.createdAt,
        },
        status: statusInfo,
        preview: SnapshotService.validateSnapshot(snapshot)
          ? SnapshotService.extractPreviewData(snapshot)
          : null,
      };
    }),

  // ==================== IMPORT OPERATIONS ====================

  /**
   * Import a shared template package
   */
  importShare: createAnyPermissionProcedure([
    PERMISSIONS.TEMPLATES_WRITE,
    PERMISSIONS.TEMPLATES_ADMIN,
  ])
    .input(
      z.object({
        shareId: z.string().cuid().optional(),
        token: z.string().optional(),
        email: z.string().email().optional(),
        targetOrganizationId: z.string().cuid(),
        namePrefix: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.targetOrganizationId);

      let share;

      // Find share by token or shareId
      if (input.token) {
        const tokenHash = ShareTokenService.hashToken(input.token);
        share = await db.templateShare.findFirst({
          where: {
            tokenHash,
            shareMode: { in: ["LINK", "MIXED"] },
          },
          include: {
            recipients: true,
            organization: {
              select: { id: true, name: true },
            },
          },
        });
      } else if (input.shareId) {
        share = await db.templateShare.findFirst({
          where: {
            id: input.shareId,
            shareMode: { in: ["EMAIL", "MIXED"] },
          },
          include: {
            recipients: true,
            organization: {
              select: { id: true, name: true },
            },
          },
        });
      }

      if (!share) {
        await db.templateShareAccessLog.create({
          data: ShareAuditService.createLogEntry("", "IMPORT", "INVALID", {
            recipientEmail: input.email,
            errorMessage: "Share not found",
          }),
        });

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share not found",
        });
      }

      // Validate email access for email shares
      if (share.shareMode === "EMAIL" && input.email) {
        const emailAccess = ShareAccessService.validateEmailAccess(
          share,
          input.email
        );
        if (!emailAccess.allowed) {
          await db.templateShareAccessLog.create({
            data: ShareAuditService.createLogEntry(
              share.id,
              "IMPORT",
              "BLOCKED",
              {
                recipientEmail: input.email,
                errorMessage: emailAccess.reason,
              }
            ),
          });

          throw new TRPCError({
            code: "FORBIDDEN",
            message: emailAccess.reason ?? "Access denied",
          });
        }
      }

      // Check share status
      const statusInfo = ShareAccessService.computeShareStatus(share);
      if (!statusInfo.canImport) {
        const mapShareStatusToAccess = (
          s: TemplateShareStatus
        ): TemplateShareAccessStatus => {
          switch (s) {
            case "EXPIRED":
              return "EXPIRED";
            case "REVOKED":
              return "REVOKED";
            case "EXHAUSTED":
              return "EXHAUSTED";
            case "ACTIVE":
              return "BLOCKED"; // active but blocked due to other conditions
            default:
              return "INVALID";
          }
        };
        const accessStatus = mapShareStatusToAccess(statusInfo.status);
        await db.templateShareAccessLog.create({
          data: ShareAuditService.createLogEntry(
            share.id,
            "IMPORT",
            accessStatus,
            {
              recipientEmail: input.email,
              errorMessage: statusInfo.message,
            }
          ),
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: statusInfo.message,
        });
      }

      // Prevent importing into the same organization
      if (share.organizationId === input.targetOrganizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot import into the same organization that created the share",
        });
      }

      const snapshot = share.snapshotData as unknown as ShareSnapshot;
      if (!SnapshotService.validateSnapshot(snapshot)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid share snapshot data",
        });
      }

      // Create new template package from snapshot
      const namePrefix = input.namePrefix ? `${input.namePrefix} ` : "";
      const newPackage = await db.templatePackage.create({
        data: {
          organizationId: input.targetOrganizationId,
          name: `${namePrefix}${snapshot.packageInfo.name}`,
          description: snapshot.packageInfo.description
            ? `${snapshot.packageInfo.description}\n\nImported from ${share.organization?.name ?? "Unknown Organization"}`
            : `Imported from ${share.organization?.name ?? "Unknown Organization"}`,
          category: snapshot.packageInfo.category,
          version: snapshot.packageInfo.version,
          iconUrl: snapshot.packageInfo.iconUrl,
          tags: snapshot.packageInfo.tags,
          manifest: toInputJson(snapshot.manifest),
          assetsCount: snapshot.metadata.totalAssets,
          createdById: ctx.user.id,
        },
      });

      // Create import record for provenance tracking
      await db.templateShareImport.create({
        data: {
          shareId: share.id,
          organizationId: input.targetOrganizationId,
          templatePackageId: newPackage.id,
          importedById: ctx.user.id,
          originalPackageId: snapshot.packageInfo.id,
          originalOrgId: share.organizationId,
          snapshotVersion: snapshot.version,
        },
      });

      // Update recipient status if email import
      if (input.email) {
        await db.templateShareRecipient.updateMany({
          where: {
            shareId: share.id,
            email: input.email.toLowerCase(),
          },
          data: {
            status: "IMPORTED",
            importedAt: new Date(),
          },
        });
      }

      // Atomically increment usage count
      const updatedShare = await db.templateShare.update({
        where: { id: share.id },
        data: {
          usageCount: { increment: 1 },
          lastAccessedAt: new Date(),
        },
      });

      // Re-check if this put us over the limit and the share should be marked as exhausted
      if (
        updatedShare.maxUses &&
        updatedShare.usageCount >= updatedShare.maxUses
      ) {
        await db.templateShare.update({
          where: { id: share.id },
          data: { status: "EXHAUSTED" },
        });
      }

      // Log successful import
      await db.templateShareAccessLog.create({
        data: ShareAuditService.createLogEntry(share.id, "IMPORT", "SUCCESS", {
          recipientEmail: input.email,
          metadata: {
            importedPackageId: newPackage.id,
            targetOrganizationId: input.targetOrganizationId,
          },
        }),
      });

      return {
        templatePackageId: newPackage.id,
        name: newPackage.name,
        success: true,
      };
    }),
});
