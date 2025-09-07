import { z } from "zod";
import {
  createTRPCRouter,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";
import { TRPCError } from "@trpc/server";

// Validation schemas - simplified for now
const reportFiltersSchema = z.object({
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    preset: z.string().optional(),
  }),
  categories: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  departments: z.array(z.string()).optional(),
  vendors: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
});

const reportTemplateSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(["data", "calculation", "summary"]),
      fields: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          source: z.enum(["expenses", "invoices", "custom"]),
          field: z.string(),
          format: z
            .enum(["currency", "percentage", "number", "date"])
            .optional(),
          aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
        })
      ),
      calculations: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            formula: z.string(),
            format: z.enum(["currency", "percentage", "number"]).optional(),
          })
        )
        .optional(),
    })
  ),
  groupBy: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  showComparisons: z.boolean().optional(),
  showPercentages: z.boolean().optional(),
  includeSubtotals: z.boolean().optional(),
});

const createReportSchema = z.object({
  organizationId: z.string(),
  name: z.string().min(1, "Report name is required"),
  description: z.string().optional(),
  type: z.enum([
    "INCOME_STATEMENT",
    "BALANCE_SHEET",
    "CASH_FLOW",
    "EXPENSE_REPORT",
    "PROFIT_LOSS",
    "CUSTOM",
  ]),
  template: reportTemplateSchema,
  filters: reportFiltersSchema,
});

const updateReportSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Report name is required").optional(),
  description: z.string().optional(),
  template: reportTemplateSchema.optional(),
  filters: reportFiltersSchema.optional(),
});

const generateReportSchema = z.object({
  organizationId: z.string(),
  reportId: z.string().optional(),
  type: z.enum([
    "INCOME_STATEMENT",
    "BALANCE_SHEET",
    "CASH_FLOW",
    "EXPENSE_REPORT",
    "PROFIT_LOSS",
    "CUSTOM",
  ]),
  filters: reportFiltersSchema,
  template: reportTemplateSchema.optional(),
});

const exportReportSchema = z.object({
  reportId: z.string(),
  format: z.enum(["csv"]), // Only CSV for now
  options: z
    .object({
      includeComparisons: z.boolean().optional(),
    })
    .optional(),
});

export const financialReportsRouter = createTRPCRouter({
  // List all reports for an organization
  list: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string(),
        type: z
          .enum([
            "INCOME_STATEMENT",
            "BALANCE_SHEET",
            "CASH_FLOW",
            "EXPENSE_REPORT",
            "PROFIT_LOSS",
            "CUSTOM",
          ])
          .optional(),
        isTemplate: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const where: {
        organizationId: string;
        type?: typeof input.type;
        isTemplate?: boolean;
      } = {
        organizationId: input.organizationId,
      };

      if (input.type) {
        where.type = input.type;
      }

      if (input.isTemplate !== undefined) {
        where.isTemplate = input.isTemplate;
      }

      return await db.financialReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get a specific report by ID
  get: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        reportId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const report = await db.financialReport.findUnique({
        where: {
          id: input.reportId,
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      await ctx.requireAnyPermission(report.organizationId);
      return report;
    }),

  // Create a new report
  create: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(createReportSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      return await db.financialReport.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          type: input.type,
          template: input.template,
          filters: input.filters,
          dateRange: input.filters.dateRange,
          createdById: ctx.user.id,
        },
      });
    }),

  // Update an existing report
  update: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(updateReportSchema)
    .mutation(async ({ input, ctx }) => {
      const report = await db.financialReport.findUnique({
        where: { id: input.id },
        select: { organizationId: true },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      await ctx.requireAnyPermission(report.organizationId);

      const updateData: {
        name?: string;
        description?: string;
        template?: z.infer<typeof reportTemplateSchema>;
        filters?: z.infer<typeof reportFiltersSchema>;
        dateRange?: z.infer<typeof reportFiltersSchema>["dateRange"];
      } = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.template !== undefined) updateData.template = input.template;
      if (input.filters !== undefined) {
        updateData.filters = input.filters;
        updateData.dateRange = input.filters.dateRange;
      }

      return await db.financialReport.update({
        where: { id: input.id },
        data: updateData,
      });
    }),

  // Delete a report
  delete: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      return await db.financialReport.delete({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });
    }),

  // Generate report data
  generate: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(generateReportSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Simple mock data generation for now
      const mockReportData = {
        type: input.type,
        period: {
          startDate: input.filters.dateRange.startDate,
          endDate: input.filters.dateRange.endDate,
        },
        summary: {
          totalAmount: 12500.75,
          totalCount: 45,
          averageAmount: 277.79,
        },
        categories: [
          { name: "Travel", amount: 4500.0, percentage: 36 },
          { name: "Office Supplies", amount: 3200.5, percentage: 25.6 },
          { name: "Marketing", amount: 2800.25, percentage: 22.4 },
          { name: "Software", amount: 2000.0, percentage: 16 },
        ],
        generated: true,
        generatedAt: new Date(),
        generatedBy: ctx.user.id,
      };

      // If this is for an existing report, update it
      if (input.reportId) {
        await db.financialReport.update({
          where: { id: input.reportId },
          data: {
            status: "COMPLETED",
            generatedAt: new Date(),
            generatedBy: ctx.user.id,
          },
        });
      }

      return {
        success: true,
        data: mockReportData,
        generatedAt: new Date(),
      };
    }),

  // Export report (CSV only)
  export: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(exportReportSchema)
    .mutation(async ({ input, ctx }) => {
      const report = await db.financialReport.findUnique({
        where: { id: input.reportId },
        select: { organizationId: true, name: true },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      await ctx.requireAnyPermission(report.organizationId);

      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get the actual report configuration
      const reportConfig = await db.financialReport.findUnique({
        where: { id: input.reportId },
        select: {
          name: true,
          type: true,
          filters: true,
          organizationId: true,
        },
      });

      if (!reportConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report configuration not found",
        });
      }

      // Extract date range from filters
      const filters = reportConfig.filters as z.infer<
        typeof reportFiltersSchema
      > | null;
      const startDate = filters?.dateRange?.startDate
        ? new Date(filters.dateRange.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
      const endDate = filters?.dateRange?.endDate
        ? new Date(filters.dateRange.endDate)
        : new Date(); // Default to today

      let csvContent = "";
      const fileName = `${report.name.replace(/[^a-zA-Z0-9-_]/g, "_")}-${new Date().toISOString().split("T")[0]}.csv`;

      // Generate CSV based on report type
      switch (reportConfig.type) {
        case "EXPENSE_REPORT":
          // Get expense data
          const expenses = await db.expense.findMany({
            where: {
              organizationId: report.organizationId,
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
            include: {
              category: true,
            },
            orderBy: { date: "desc" },
          });

          const expenseHeaders =
            "Date,Description,Category,Amount,Currency,Vendor,Payment Method,Reimbursable,Status,Notes";
          const expenseRows = expenses.map(expense =>
            [
              expense.date.toISOString().split("T")[0],
              `"${expense.description ?? ""}"`,
              `"${expense.category?.name ?? expense.customCategory ?? "Uncategorized"}"`,
              expense.amount.toString(),
              expense.currency,
              `"${expense.vendor ?? ""}"`,
              expense.paymentMethod,
              expense.reimbursable ? "Yes" : "No",
              expense.status,
              `"${expense.notes ?? ""}"`,
            ].join(",")
          );

          csvContent = [expenseHeaders, ...expenseRows].join("\n");
          break;

        case "INCOME_STATEMENT":
        case "PROFIT_LOSS":
          // Get both expenses and invoices
          const incomeExpenses = await db.expense.findMany({
            where: {
              organizationId: report.organizationId,
              date: { gte: startDate, lte: endDate },
            },
          });

          const invoices = await db.invoice.findMany({
            where: {
              organizationId: report.organizationId,
              createdAt: { gte: startDate, lte: endDate },
            },
            include: { customer: true },
          });

          const incomeHeaders =
            "Type,Date,Description,Category/Customer,Amount,Currency,Status";
          const incomeRows = [
            ...incomeExpenses.map(expense =>
              [
                "Expense",
                expense.date.toISOString().split("T")[0],
                `"${expense.description ?? ""}"`,
                `"${expense.customCategory ?? "Uncategorized"}"`,
                `-${expense.amount.toString()}`, // Negative for expenses
                expense.currency,
                "Completed",
              ].join(",")
            ),
            ...invoices.map(invoice =>
              [
                "Revenue",
                invoice.createdAt.toISOString().split("T")[0],
                `"Invoice ${invoice.invoiceNumber}"`,
                `"${invoice.customerName ?? invoice.customer.firstName + " " + invoice.customer.lastName}"`,
                invoice.totalAmount.toString(),
                invoice.currency,
                invoice.status,
              ].join(",")
            ),
          ];

          csvContent = [incomeHeaders, ...incomeRows].join("\n");
          break;

        default:
          // For other report types, get general financial data
          const generalExpenses = await db.expense.findMany({
            where: {
              organizationId: report.organizationId,
              date: { gte: startDate, lte: endDate },
            },
            orderBy: { date: "desc" },
          });

          const defaultHeaders =
            "Date,Type,Description,Category,Amount,Currency,Status";
          const defaultRows = generalExpenses.map(expense =>
            [
              expense.date.toISOString().split("T")[0],
              "Expense",
              `"${expense.description ?? ""}"`,
              `"${expense.customCategory ?? "Uncategorized"}"`,
              expense.amount.toString(),
              expense.currency,
              expense.status,
            ].join(",")
          );

          csvContent = [defaultHeaders, ...defaultRows].join("\n");
          break;
      }

      return {
        success: true,
        fileName,
        csvContent,
        message: "CSV export completed successfully",
      };
    }),

  // Get latest report data
  getLatestData: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        reportId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const report = await db.financialReport.findUnique({
        where: { id: input.reportId },
        select: { organizationId: true },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      await ctx.requireAnyPermission(report.organizationId);

      // Return mock data for now
      return {
        id: "mock-data-id",
        reportId: input.reportId,
        data: {
          summary: {
            totalAmount: 12500.75,
            totalCount: 45,
            averageAmount: 277.79,
          },
          categories: [
            { name: "Travel", amount: 4500.0, percentage: 36 },
            { name: "Office Supplies", amount: 3200.5, percentage: 25.6 },
            { name: "Marketing", amount: 2800.25, percentage: 22.4 },
            { name: "Software", amount: 2000.0, percentage: 16 },
          ],
        },
        createdAt: new Date(),
        metadata: {
          generatedAt: new Date(),
          version: "1.0",
        },
      };
    }),
});
