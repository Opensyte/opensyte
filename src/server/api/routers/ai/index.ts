import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  createPermissionProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { isAIEnabled } from "~/lib/ai/config";
import { PERMISSIONS } from "~/lib/rbac";
import {
  classifyDocument,
  generateAuditAnalysis,
  detectAnomalies,
} from "~/lib/ai/audit-services";
import {
  generatePersonalizedView,
  generateRoleInsights,
} from "~/lib/ai/personalized-views";
import {
  PersonalizedViewTypeSchema,
  AIInsightStatusSchema,
} from "prisma/generated/zod";

// Create AI-specific procedures
const aiReadProcedure = createPermissionProcedure(PERMISSIONS.AI_READ);
const aiWriteProcedure = createPermissionProcedure(PERMISSIONS.AI_WRITE);

export const aiRouter = createTRPCRouter({
  // Check if AI features are enabled
  isEnabled: publicProcedure.query(() => {
    return { enabled: isAIEnabled() };
  }),

  // Document Classification
  classifyDocument: aiReadProcedure
    .input(
      z.object({
        fileContent: z.string(),
        fileName: z.string(),
        fileType: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      if (!isAIEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not enabled",
        });
      }

      try {
        const result = await classifyDocument(
          input.fileContent,
          input.fileName,
          input.fileType
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to classify document",
          cause: error,
        });
      }
    }),

  // Generate Audit Package
  generateAuditPackage: aiWriteProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        dateRange: z.object({
          start: z.date(),
          end: z.date(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      // Get relevant financial data
      const [invoices, expenses, payments] = await Promise.all([
        ctx.db.invoice.findMany({
          where: {
            organizationId: input.organizationId,
            issueDate: {
              gte: input.dateRange.start,
              lte: input.dateRange.end,
            },
          },
        }),
        ctx.db.expense.findMany({
          where: {
            organizationId: input.organizationId,
            date: {
              gte: input.dateRange.start,
              lte: input.dateRange.end,
            },
          },
        }),
        ctx.db.payment.findMany({
          where: {
            paymentDate: {
              gte: input.dateRange.start,
              lte: input.dateRange.end,
            },
            invoice: {
              organizationId: input.organizationId,
            },
          },
          include: {
            invoice: true,
          },
        }),
      ]);

      // Create audit package
      const auditPackage = await ctx.db.auditPackage.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          dateRange: input.dateRange,
          status: "PROCESSING",
          totalTransactions:
            invoices.length + expenses.length + payments.length,
          totalDocuments: 0,
          createdById: ctx.user.id,
        },
      });

      // Generate AI analysis if enabled
      if (isAIEnabled()) {
        try {
          const transactions = [
            ...invoices.map(i => ({
              id: i.id,
              type: "invoice",
              amount: Number(i.totalAmount),
              date: i.issueDate.toISOString(),
              description: `Invoice ${i.invoiceNumber}`,
            })),
            ...expenses.map(e => ({
              id: e.id,
              type: "expense",
              amount: Number(e.amount),
              date: e.date.toISOString(),
              description: e.description ?? "Unknown expense",
            })),
            ...payments.map(p => ({
              id: p.id,
              type: "payment",
              amount: Number(p.amount),
              date: p.paymentDate.toISOString(),
              description: `Payment for invoice ${p.invoice.invoiceNumber}`,
            })),
          ];

          const analysis = await generateAuditAnalysis(
            transactions,
            [], // Documents will be added separately
            input.dateRange
          );

          // Update audit package with AI analysis
          await ctx.db.auditPackage.update({
            where: { id: auditPackage.id },
            data: {
              riskScore: analysis.riskScore,
              status: "COMPLETED",
              generatedAt: new Date(),
            },
          });

          return {
            ...auditPackage,
            analysis,
          };
        } catch (error) {
          console.error("AI analysis failed:", error);

          await ctx.db.auditPackage.update({
            where: { id: auditPackage.id },
            data: { status: "COMPLETED" },
          });
        }
      }

      return auditPackage;
    }),

  // Get Personalized View
  getPersonalizedView: aiReadProcedure
    .input(
      z.object({
        organizationId: z.string(),
        viewType: PersonalizedViewTypeSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      // Get or create personalized view
      let personalizedView = await ctx.db.personalizedView.findUnique({
        where: {
          userId_organizationId_viewType: {
            userId: ctx.user.id,
            organizationId: input.organizationId,
            viewType: input.viewType,
          },
        },
      });

      if (!personalizedView || !isAIEnabled()) {
        // Create default view or regenerate with AI
        const organization = await ctx.db.organization.findUnique({
          where: { id: input.organizationId },
          include: {
            users: true,
            customers: true,
            projects: true,
            invoices: true,
            expenses: true,
          },
        });

        if (!organization) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organization not found",
          });
        }

        const orgData = {
          id: organization.id,
          name: organization.name,
          industry: organization.industry ?? undefined,
          users: organization.users.length,
          revenue: organization.invoices.reduce(
            (sum: number, inv) => sum + Number(inv.totalAmount),
            0
          ),
          expenses: organization.expenses.reduce(
            (sum: number, exp) => sum + Number(exp.amount),
            0
          ),
          customers: organization.customers.length,
          projects: organization.projects.length,
        };

        // Get user activity data
        const userActivity = await ctx.db.userBehavior.findMany({
          where: {
            userId: ctx.user.id,
            organizationId: input.organizationId,
          },
          orderBy: { timestamp: "desc" },
          take: 50,
        });

        const activityData = userActivity.map(a => ({
          module: a.module,
          action: a.action,
          frequency: 1,
          lastAccessed: a.timestamp,
        }));

        if (isAIEnabled()) {
          try {
            const userOrg = await ctx.db.userOrganization.findFirst({
              where: {
                userId: ctx.user.id,
                organizationId: input.organizationId,
              },
            });

            if (!userOrg?.role) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Access denied",
              });
            }

            const viewConfig = await generatePersonalizedView(
              userOrg.role,
              orgData,
              activityData
            );

            personalizedView = await ctx.db.personalizedView.upsert({
              where: {
                userId_organizationId_viewType: {
                  userId: ctx.user.id,
                  organizationId: input.organizationId,
                  viewType: input.viewType,
                },
              },
              update: {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                configuration: viewConfig as any,
                lastUpdated: new Date(),
              },
              create: {
                userId: ctx.user.id,
                organizationId: input.organizationId,
                viewType: input.viewType,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                configuration: viewConfig as any,
              },
            });
          } catch (error) {
            console.error("Failed to generate personalized view:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate personalized view",
            });
          }
        }
      }

      return personalizedView;
    }),

  // Generate Role Insights
  generateInsights: aiReadProcedure
    .input(
      z.object({
        organizationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      if (!isAIEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI features are not enabled",
        });
      }

      // Get organization data
      const organization = await ctx.db.organization.findUnique({
        where: { id: input.organizationId },
        include: {
          invoices: { take: 100, orderBy: { createdAt: "desc" } },
          expenses: { take: 100, orderBy: { createdAt: "desc" } },
        },
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: ctx.user.id,
          organizationId: input.organizationId,
        },
      });

      if (!userOrg?.role) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const orgData = {
        id: organization.id,
        name: organization.name,
        industry: organization.industry ?? undefined,
        users: 0,
        revenue: organization.invoices.reduce(
          (sum: number, inv) => sum + Number(inv.totalAmount),
          0
        ),
        expenses: organization.expenses.reduce(
          (sum: number, exp) => sum + Number(exp.amount),
          0
        ),
        customers: 0,
        projects: 0,
      };

      const financialData = {
        invoices: organization.invoices,
        expenses: organization.expenses,
      };

      try {
        const insights = await generateRoleInsights(
          userOrg.role,
          orgData,
          financialData
        );

        // Store insights in database
        const insightRecords = await Promise.all(
          insights.insights.map(insight =>
            ctx.db.aIInsight.create({
              data: {
                organizationId: input.organizationId,
                userId: ctx.user.id,
                type: insight.type.toUpperCase() as
                  | "ANOMALY_DETECTION"
                  | "TREND_ANALYSIS"
                  | "PREDICTION"
                  | "RECOMMENDATION"
                  | "ALERT"
                  | "OPPORTUNITY",
                category: "financial",
                title: insight.title,
                description: insight.description,
                confidence: insight.confidence,
                priority: insight.priority.toUpperCase() as
                  | "LOW"
                  | "MEDIUM"
                  | "HIGH"
                  | "CRITICAL",
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                data: insight.data as any,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                recommendations: insights.recommendations as any,
              },
            })
          )
        );

        return {
          insights: insightRecords,
          summary: insights.summary,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate insights",
          cause: error,
        });
      }
    }),

  // Detect Anomalies
  detectAnomalies: aiReadProcedure
    .input(
      z.object({
        organizationId: z.string(),
        dataType: z.enum(["expenses", "invoices", "payments"]),
        limit: z.number().default(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      if (!isAIEnabled()) {
        return {
          anomalies: [],
          riskLevel: "LOW" as const,
          summary: "AI features are disabled",
        };
      }

      let data: Record<string, unknown>[] = [];

      switch (input.dataType) {
        case "expenses":
          data = await ctx.db.expense.findMany({
            where: { organizationId: input.organizationId },
            take: input.limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "invoices":
          data = await ctx.db.invoice.findMany({
            where: { organizationId: input.organizationId },
            take: input.limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "payments":
          data = await ctx.db.payment.findMany({
            where: {
              invoice: { organizationId: input.organizationId },
            },
            take: input.limit,
            orderBy: { createdAt: "desc" },
            include: { invoice: true },
          });
          break;
      }

      try {
        const result = await detectAnomalies(data, input.dataType);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to detect anomalies",
          cause: error,
        });
      }
    }),

  // Get AI Insights for User
  getInsights: aiReadProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: AIInsightStatusSchema.optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const insights = await ctx.db.aIInsight.findMany({
        where: {
          organizationId: input.organizationId,
          OR: [
            { userId: ctx.user.id },
            { userId: null }, // Organization-wide insights
          ],
          ...(input.status && { status: input.status }),
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: input.limit,
      });

      return insights;
    }),

  // Dismiss Insight
  dismissInsight: aiWriteProcedure
    .input(
      z.object({
        insightId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const insight = await ctx.db.aIInsight.findUnique({
        where: { id: input.insightId },
      });

      if (!insight) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Insight not found",
        });
      }

      await ctx.requirePermission(insight.organizationId);

      const updatedInsight = await ctx.db.aIInsight.update({
        where: { id: input.insightId },
        data: {
          status: "DISMISSED",
          dismissedAt: new Date(),
          dismissedById: ctx.user.id,
        },
      });

      return updatedInsight;
    }),

  // Get Audit Packages
  getAuditPackages: aiReadProcedure
    .input(
      z.object({
        organizationId: z.string(),
        limit: z.number().min(1).max(50).default(10),
        status: z
          .enum([
            "DRAFT",
            "PROCESSING",
            "REVIEW",
            "COMPLETED",
            "EXPORTED",
            "ARCHIVED",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requirePermission(input.organizationId);

      const auditPackages = await ctx.db.auditPackage.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.status && { status: input.status }),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.limit,
        include: {
          documents: {
            select: {
              id: true,
              fileName: true,
              classification: true,
            },
          },
          _count: {
            select: {
              documents: true,
              trails: true,
            },
          },
        },
      });

      return auditPackages;
    }),
});
