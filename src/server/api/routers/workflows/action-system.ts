import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import { PERMISSIONS } from "~/lib/rbac";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import {
  WhatsAppMessageTypeSchema,
  InputJsonValueSchema,
} from "../../../../../prisma/generated/zod";
import type { Prisma } from "@prisma/client";

// Comprehensive action system router for workflow actions
export const actionSystemRouter = createTRPCRouter({
  // ==================== EMAIL ACTIONS ====================

  // Create email action
  createEmailAction: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
        integrationId: z.string().cuid().optional(),
        fromName: z.string().max(100).optional(),
        fromEmail: z.string().email().optional(),
        replyTo: z.string().email().optional(),
        toEmails: z.array(z.string()).min(1).max(100),
        ccEmails: z.array(z.string()).optional(),
        bccEmails: z.array(z.string()).optional(),
        subject: z.string().min(1).max(500),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
        templateId: z.string().optional(),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              url: z.string(),
              type: z.string(),
            })
          )
          .optional(),
        trackOpens: z.boolean().default(false),
        trackClicks: z.boolean().default(false),
        variables: InputJsonValueSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify node exists and belongs to organization's workflow
        const node = await db.workflowNode.findFirst({
          where: {
            id: input.nodeId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!node) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow node not found",
          });
        }

        // Verify integration if provided
        if (input.integrationId) {
          const integration = await db.integrationConfig.findFirst({
            where: {
              id: input.integrationId,
              organizationId: input.organizationId,
              type: {
                in: [
                  "EMAIL_SMTP",
                  "EMAIL_SENDGRID",
                  "EMAIL_MAILGUN",
                  "EMAIL_RESEND",
                  "EMAIL_POSTMARK",
                ],
              },
              isActive: true,
            },
          });

          if (!integration) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Email integration not found or inactive",
            });
          }
        }

        const emailAction = await db.emailAction.create({
          data: {
            nodeId: input.nodeId,
            integrationId: input.integrationId,
            fromName: input.fromName,
            fromEmail: input.fromEmail,
            replyTo: input.replyTo,
            toEmails: input.toEmails as Prisma.InputJsonValue,
            ccEmails: input.ccEmails as Prisma.InputJsonValue,
            bccEmails: input.bccEmails as Prisma.InputJsonValue,
            subject: input.subject,
            htmlBody: input.htmlBody,
            textBody: input.textBody,
            templateId: input.templateId,
            attachments: input.attachments as Prisma.InputJsonValue,
            trackOpens: input.trackOpens,
            trackClicks: input.trackClicks,
            variables: input.variables!,
          },
        });

        return emailAction;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create email action:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create email action",
        });
      }
    }),

  // Get email actions for a node
  getEmailActions: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        const emailActions = await db.emailAction.findMany({
          where: {
            nodeId: input.nodeId,
          },
          orderBy: { createdAt: "asc" },
        });

        return emailActions;
      } catch (error) {
        console.error("Failed to fetch email actions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch email actions",
        });
      }
    }),

  // ==================== SMS ACTIONS ====================

  // Create SMS action
  createSmsAction: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
        integrationId: z.string().cuid().optional(),
        fromNumber: z.string().optional(),
        toNumbers: z.array(z.string()).min(1).max(50),
        message: z.string().min(1).max(1600),
        templateId: z.string().optional(),
        maxLength: z.number().min(70).max(1600).optional(),
        unicode: z.boolean().default(false),
        variables: InputJsonValueSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify node exists and belongs to organization's workflow
        const node = await db.workflowNode.findFirst({
          where: {
            id: input.nodeId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!node) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow node not found",
          });
        }

        // Verify SMS integration if provided
        if (input.integrationId) {
          const integration = await db.integrationConfig.findFirst({
            where: {
              id: input.integrationId,
              organizationId: input.organizationId,
              type: {
                in: [
                  "SMS_TWILIO",
                  "SMS_AWS_SNS",
                  "SMS_NEXMO",
                  "SMS_MESSAGEBIRD",
                ],
              },
              isActive: true,
            },
          });

          if (!integration) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "SMS integration not found or inactive",
            });
          }
        }

        const smsAction = await db.smsAction.create({
          data: {
            nodeId: input.nodeId,
            integrationId: input.integrationId,
            fromNumber: input.fromNumber,
            toNumbers: input.toNumbers as Prisma.InputJsonValue,
            message: input.message,
            templateId: input.templateId,
            maxLength: input.maxLength,
            unicode: input.unicode,
            variables: input.variables!,
          },
        });

        return smsAction;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create SMS action:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create SMS action",
        });
      }
    }),

  // ==================== WHATSAPP ACTIONS ====================

  // Create WhatsApp action
  createWhatsAppAction: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
        integrationId: z.string().cuid().optional(),
        businessAccountId: z.string().optional(),
        toNumbers: z.array(z.string()).min(1).max(50),
        messageType: WhatsAppMessageTypeSchema.default("TEXT"),
        textMessage: z.string().optional(),
        templateName: z.string().optional(),
        templateLanguage: z.string().optional(),
        mediaUrl: z.string().url().optional(),
        mediaType: z.enum(["image", "video", "audio", "document"]).optional(),
        caption: z.string().optional(),
        templateParams: InputJsonValueSchema.optional(),
        variables: InputJsonValueSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify node exists and belongs to organization's workflow
        const node = await db.workflowNode.findFirst({
          where: {
            id: input.nodeId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!node) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow node not found",
          });
        }

        // Verify WhatsApp integration if provided
        if (input.integrationId) {
          const integration = await db.integrationConfig.findFirst({
            where: {
              id: input.integrationId,
              organizationId: input.organizationId,
              type: { in: ["WHATSAPP_BUSINESS", "WHATSAPP_TWILIO"] },
              isActive: true,
            },
          });

          if (!integration) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "WhatsApp integration not found or inactive",
            });
          }
        }

        const whatsAppAction = await db.whatsAppAction.create({
          data: {
            nodeId: input.nodeId,
            integrationId: input.integrationId,
            businessAccountId: input.businessAccountId,
            toNumbers: input.toNumbers as Prisma.InputJsonValue,
            messageType: input.messageType,
            textMessage: input.textMessage,
            templateName: input.templateName,
            templateLanguage: input.templateLanguage,
            mediaUrl: input.mediaUrl,
            mediaType: input.mediaType,
            caption: input.caption,
            templateParams: input.templateParams!,
            variables: input.variables!,
          },
        });

        return whatsAppAction;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create WhatsApp action:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create WhatsApp action",
        });
      }
    }),

  // ==================== SLACK ACTIONS ====================

  // Create Slack action
  createSlackAction: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
        integrationId: z.string().cuid().optional(),
        workspaceId: z.string().optional(),
        channel: z.string().optional(),
        userId: z.string().optional(),
        message: z.string().min(1).max(4000),
        blocks: InputJsonValueSchema.optional(),
        attachments: InputJsonValueSchema.optional(),
        asUser: z.boolean().default(false),
        username: z.string().optional(),
        iconEmoji: z.string().optional(),
        iconUrl: z.string().url().optional(),
        threadTs: z.string().optional(),
        replyBroadcast: z.boolean().default(false),
        variables: InputJsonValueSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify node exists and belongs to organization's workflow
        const node = await db.workflowNode.findFirst({
          where: {
            id: input.nodeId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!node) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow node not found",
          });
        }

        // Verify Slack integration if provided
        if (input.integrationId) {
          const integration = await db.integrationConfig.findFirst({
            where: {
              id: input.integrationId,
              organizationId: input.organizationId,
              type: "SLACK",
              isActive: true,
            },
          });

          if (!integration) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Slack integration not found or inactive",
            });
          }
        }

        const slackAction = await db.slackAction.create({
          data: {
            nodeId: input.nodeId,
            integrationId: input.integrationId,
            workspaceId: input.workspaceId,
            channel: input.channel,
            userId: input.userId,
            message: input.message,
            blocks: input.blocks!,
            attachments: input.attachments!,
            asUser: input.asUser,
            username: input.username,
            iconEmoji: input.iconEmoji,
            iconUrl: input.iconUrl,
            threadTs: input.threadTs,
            replyBroadcast: input.replyBroadcast,
            variables: input.variables!,
          },
        });

        return slackAction;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create Slack action:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Slack action",
        });
      }
    }),

  // ==================== CALENDAR ACTIONS ====================

  // Create calendar action
  createCalendarAction: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
        integrationId: z.string().cuid().optional(),
        calendarId: z.string().optional(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        location: z.string().optional(),
        startTime: z.string(), // ISO datetime or variable reference
        endTime: z.string(), // ISO datetime or variable reference
        isAllDay: z.boolean().default(false),
        timezone: z.string().default("UTC"),
        attendees: z.array(z.string().email()).optional(),
        organizer: z.string().email().optional(),
        reminders: InputJsonValueSchema.optional(),
        recurrence: InputJsonValueSchema.optional(),
        variables: InputJsonValueSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Verify node exists and belongs to organization's workflow
        const node = await db.workflowNode.findFirst({
          where: {
            id: input.nodeId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!node) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow node not found",
          });
        }

        // Verify calendar integration if provided
        if (input.integrationId) {
          const integration = await db.integrationConfig.findFirst({
            where: {
              id: input.integrationId,
              organizationId: input.organizationId,
              type: {
                in: ["GOOGLE_CALENDAR", "OUTLOOK_CALENDAR", "APPLE_CALENDAR"],
              },
              isActive: true,
            },
          });

          if (!integration) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Calendar integration not found or inactive",
            });
          }
        }

        const calendarAction = await db.calendarAction.create({
          data: {
            nodeId: input.nodeId,
            integrationId: input.integrationId,
            calendarId: input.calendarId,
            title: input.title,
            description: input.description,
            location: input.location,
            startTime: input.startTime,
            endTime: input.endTime,
            isAllDay: input.isAllDay,
            timezone: input.timezone,
            attendees: input.attendees as Prisma.InputJsonValue,
            organizer: input.organizer,
            reminders: input.reminders!,
            recurrence: input.recurrence!,
            variables: input.variables!,
          },
        });

        return calendarAction;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to create calendar action:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create calendar action",
        });
      }
    }),

  // ==================== GENERIC ACTION MANAGEMENT ====================

  // Get all actions for a workflow node
  getNodeActions: createAnyPermissionProcedure([
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.WORKFLOWS_ADMIN,
  ])
    .input(
      z.object({
        nodeId: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      try {
        // Verify node belongs to organization
        const node = await db.workflowNode.findFirst({
          where: {
            id: input.nodeId,
            workflow: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!node) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow node not found",
          });
        }

        // Fetch all action types for this node
        const [
          emailActions,
          smsActions,
          whatsAppActions,
          slackActions,
          calendarActions,
        ] = await Promise.all([
          db.emailAction.findMany({ where: { nodeId: input.nodeId } }),
          db.smsAction.findMany({ where: { nodeId: input.nodeId } }),
          db.whatsAppAction.findMany({ where: { nodeId: input.nodeId } }),
          db.slackAction.findMany({ where: { nodeId: input.nodeId } }),
          db.calendarAction.findMany({ where: { nodeId: input.nodeId } }),
        ]);

        return {
          nodeId: input.nodeId,
          nodeType: node.type,
          actions: {
            email: emailActions,
            sms: smsActions,
            whatsapp: whatsAppActions,
            slack: slackActions,
            calendar: calendarActions,
          },
          totalActions:
            emailActions.length +
            smsActions.length +
            whatsAppActions.length +
            slackActions.length +
            calendarActions.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to fetch node actions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch node actions",
        });
      }
    }),

  // Delete action by type and ID
  deleteAction: createPermissionProcedure(PERMISSIONS.WORKFLOWS_WRITE)
    .input(
      z.object({
        actionId: z.string().cuid(),
        actionType: z.enum(["email", "sms", "whatsapp", "slack", "calendar"]),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      try {
        // Delete based on action type
        let deletedAction;
        switch (input.actionType) {
          case "email":
            // Verify action exists and get its nodeId
            const emailAction = await db.emailAction.findUnique({
              where: { id: input.actionId },
              select: { nodeId: true },
            });

            if (!emailAction) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Email action not found",
              });
            }

            // Verify the workflow belongs to the organization
            const emailWorkflow = await db.workflowNode.findFirst({
              where: {
                id: emailAction.nodeId,
                workflow: {
                  organizationId: input.organizationId,
                },
              },
            });

            if (!emailWorkflow) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Email action not found",
              });
            }

            deletedAction = await db.emailAction.delete({
              where: { id: input.actionId },
            });
            break;

          case "sms":
            const smsAction = await db.smsAction.findUnique({
              where: { id: input.actionId },
              select: { nodeId: true },
            });

            if (!smsAction) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "SMS action not found",
              });
            }

            const smsWorkflow = await db.workflowNode.findFirst({
              where: {
                id: smsAction.nodeId,
                workflow: {
                  organizationId: input.organizationId,
                },
              },
            });

            if (!smsWorkflow) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "SMS action not found",
              });
            }

            deletedAction = await db.smsAction.delete({
              where: { id: input.actionId },
            });
            break;

          case "whatsapp":
            const whatsAppAction = await db.whatsAppAction.findUnique({
              where: { id: input.actionId },
              select: { nodeId: true },
            });

            if (!whatsAppAction) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "WhatsApp action not found",
              });
            }

            const whatsAppWorkflow = await db.workflowNode.findFirst({
              where: {
                id: whatsAppAction.nodeId,
                workflow: {
                  organizationId: input.organizationId,
                },
              },
            });

            if (!whatsAppWorkflow) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "WhatsApp action not found",
              });
            }

            deletedAction = await db.whatsAppAction.delete({
              where: { id: input.actionId },
            });
            break;

          case "slack":
            const slackAction = await db.slackAction.findUnique({
              where: { id: input.actionId },
              select: { nodeId: true },
            });

            if (!slackAction) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Slack action not found",
              });
            }

            const slackWorkflow = await db.workflowNode.findFirst({
              where: {
                id: slackAction.nodeId,
                workflow: {
                  organizationId: input.organizationId,
                },
              },
            });

            if (!slackWorkflow) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Slack action not found",
              });
            }

            deletedAction = await db.slackAction.delete({
              where: { id: input.actionId },
            });
            break;

          case "calendar":
            const calendarAction = await db.calendarAction.findUnique({
              where: { id: input.actionId },
              select: { nodeId: true },
            });

            if (!calendarAction) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Calendar action not found",
              });
            }

            const calendarWorkflow = await db.workflowNode.findFirst({
              where: {
                id: calendarAction.nodeId,
                workflow: {
                  organizationId: input.organizationId,
                },
              },
            });

            if (!calendarWorkflow) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Calendar action not found",
              });
            }

            deletedAction = await db.calendarAction.delete({
              where: { id: input.actionId },
            });
            break;

          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid action type",
            });
        }

        return {
          success: true,
          actionType: input.actionType,
          deletedAction,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Failed to delete action:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete action",
        });
      }
    }),
});
