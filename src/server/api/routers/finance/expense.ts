import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  createTRPCRouter,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";
import {
  ExpenseStatusSchema,
  PaymentMethodSchema,
} from "../../../../../prisma/generated/zod";
import { formatDecimalLike } from "~/server/utils/format";

// Shared schemas for better reusability
const expenseFiltersSchema = z.object({
  status: z.array(ExpenseStatusSchema).optional(),
  categoryId: z.array(z.string()).optional(),
  paymentMethod: z.array(PaymentMethodSchema).optional(),
  projectId: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  reimbursable: z.boolean().optional(),
  search: z.string().optional(),
});

const expenseFormSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  date: z.date(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  customCategory: z.string().optional(),
  vendor: z.string().optional(),
  paymentMethod: PaymentMethodSchema.default("CREDIT_CARD"),
  projectId: z.string().optional(),
  reimbursable: z.boolean().default(false),
  receipt: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Builds expense WHERE clause from filters
 */
function buildExpenseFilters(
  organizationId: string,
  filters: z.infer<typeof expenseFiltersSchema>,
  _userId?: string
): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {
    organizationId,
  };

  if (filters.status?.length) {
    where.status = { in: filters.status };
  }

  if (filters.categoryId?.length) {
    where.categoryId = { in: filters.categoryId };
  }

  if (filters.paymentMethod?.length) {
    where.paymentMethod = { in: filters.paymentMethod };
  }

  if (filters.projectId?.length) {
    where.projectId = { in: filters.projectId };
  }

  if (filters.dateFrom ?? filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = filters.dateFrom;
    if (filters.dateTo) where.date.lte = filters.dateTo;
  }

  if (filters.amountMin ?? filters.amountMax) {
    where.amount = {};
    if (filters.amountMin)
      where.amount.gte = new Prisma.Decimal(filters.amountMin);
    if (filters.amountMax)
      where.amount.lte = new Prisma.Decimal(filters.amountMax);
  }

  if (filters.reimbursable !== undefined) {
    where.reimbursable = filters.reimbursable;
  }

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { vendor: { contains: filters.search, mode: "insensitive" } },
      { customCategory: { contains: filters.search, mode: "insensitive" } },
      { notes: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export const expenseRouter = createTRPCRouter({
  // Get all expenses with filtering, pagination
  list: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string(),
        filters: expenseFiltersSchema.optional(),
        pagination: z
          .object({
            page: z.number().min(1).default(1),
            limit: z.number().min(1).max(100).default(25),
          })
          .optional(),
        sortBy: z.enum(["date", "amount", "createdAt"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const {
        organizationId,
        filters = {},
        pagination = { page: 1, limit: 25 },
        sortBy,
        sortOrder,
      } = input;

      const where = buildExpenseFilters(organizationId, filters, ctx.user?.id);

      const orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
      if (sortBy === "amount") orderBy.amount = sortOrder;
      else if (sortBy === "date") orderBy.date = sortOrder;
      else if (sortBy === "createdAt") orderBy.createdAt = sortOrder;

      const [expenses, totalCount] = await Promise.all([
        db.expense.findMany({
          where,
          orderBy,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          include: {
            category: true,
            project: { select: { id: true, name: true } },
          },
        }),
        db.expense.count({ where }),
      ]);

      return {
        expenses: expenses.map(expense => ({
          ...expense,
          amount: formatDecimalLike(expense.amount),
        })),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / pagination.limit),
        },
      };
    }),

  // Get expense by ID
  getById: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);

      const expense = await db.expense.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          category: true,
          project: { select: { id: true, name: true } },
        },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      return {
        ...expense,
        amount: formatDecimalLike(expense.amount),
      };
    }),

  // Create expense
  create: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string(),
        data: expenseFormSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const { organizationId, data } = input;
      const userId = ctx.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Create the expense
      const expense = await db.expense.create({
        data: {
          organizationId,
          amount: new Prisma.Decimal(data.amount),
          currency: data.currency,
          date: data.date,
          description: data.description,
          categoryId: data.categoryId,
          customCategory: data.customCategory,
          vendor: data.vendor,
          paymentMethod: data.paymentMethod,
          // Only set projectId if it's provided and not empty
          ...(data.projectId && { projectId: data.projectId }),
          reimbursable: data.reimbursable,
          receipt: data.receipt,
          notes: data.notes,
          status: "DRAFT",
          createdById: userId,
        },
        include: {
          category: true,
          project: { select: { id: true, name: true } },
        },
      });

      return {
        ...expense,
        amount: formatDecimalLike(expense.amount),
      };
    }),

  // Update expense
  update: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
        data: expenseFormSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const { id, organizationId, data } = input;
      const userId = ctx.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Check if expense exists
      const existingExpense = await db.expense.findFirst({
        where: { id, organizationId },
      });

      if (!existingExpense) {
        throw new Error("Expense not found");
      }

      // Prepare update data - use relation connect/disconnect for foreign keys
      const updateData: Prisma.ExpenseUpdateInput = {};

      if (data.amount !== undefined)
        updateData.amount = new Prisma.Decimal(data.amount);
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.categoryId !== undefined) {
        updateData.category = data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };
      }
      if (data.customCategory !== undefined)
        updateData.customCategory = data.customCategory;
      if (data.vendor !== undefined) updateData.vendor = data.vendor;
      if (data.paymentMethod !== undefined)
        updateData.paymentMethod = data.paymentMethod;
      if (data.projectId !== undefined) {
        updateData.project = data.projectId
          ? { connect: { id: data.projectId } }
          : { disconnect: true };
      }
      if (data.reimbursable !== undefined)
        updateData.reimbursable = data.reimbursable;
      if (data.receipt !== undefined) updateData.receipt = data.receipt;
      if (data.notes !== undefined) updateData.notes = data.notes;

      // Update the expense
      const expense = await db.expense.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          project: { select: { id: true, name: true } },
        },
      });

      return {
        ...expense,
        amount: formatDecimalLike(expense.amount),
      };
    }),

  // Delete expense - using "remove" to avoid JS reserved word issue
  remove: createAnyPermissionProcedure([
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
      const { id, organizationId } = input;

      // Check if expense exists
      const existingExpense = await db.expense.findFirst({
        where: { id, organizationId },
      });

      if (!existingExpense) {
        throw new Error("Expense not found");
      }

      await db.expense.delete({
        where: { id },
      });

      return { success: true };
    }),

  // Get expense summary/statistics
  getSummary: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string(),
        filters: expenseFiltersSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const { organizationId, filters = {} } = input;

      const where = buildExpenseFilters(organizationId, filters, ctx.user?.id);

      // Get monthly trend data for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [totalStats, categoryBreakdown, statusCounts, monthlyTrend] =
        await Promise.all([
          db.expense.aggregate({
            where,
            _sum: { amount: true },
            _count: true,
          }),
          db.expense.groupBy({
            by: ["categoryId"],
            where,
            _sum: { amount: true },
            _count: true,
          }),
          db.expense.groupBy({
            by: ["status"],
            where,
            _count: true,
          }),
          db.$queryRaw<Array<{ month: string; amount: number; count: number }>>`
          SELECT 
            TO_CHAR(date, 'YYYY-MM') as month,
            CAST(SUM(amount) AS DECIMAL(10,2)) as amount,
            COUNT(*)::int as count
          FROM "Expense"
          WHERE "organizationId" = ${organizationId}
            AND date >= ${sixMonthsAgo}
          GROUP BY TO_CHAR(date, 'YYYY-MM')
          ORDER BY month DESC
          LIMIT 6
        `,
        ]);

      // Get category names
      const categoryIds = categoryBreakdown
        .map(cb => cb.categoryId)
        .filter((id): id is string => id !== null);

      const categories = await db.expenseCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });

      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      return {
        totalAmount: Number(totalStats._sum.amount ?? 0),
        totalCount: totalStats._count,
        pendingApproval:
          statusCounts.find(sc => sc.status === "SUBMITTED")?._count ?? 0,
        pendingReimbursement:
          statusCounts.find(sc => sc.status === "APPROVED")?._count ?? 0,
        categoryBreakdown: categoryBreakdown.map(cb => ({
          category: cb.categoryId
            ? (categoryMap.get(cb.categoryId) ?? "Unknown")
            : "Uncategorized",
          amount: Number(cb._sum.amount ?? 0),
          count: cb._count,
        })),
        statusBreakdown: statusCounts.map(sc => ({
          status: sc.status,
          count: sc._count,
        })),
        monthlyTrend: monthlyTrend.map(mt => ({
          month: mt.month,
          amount: Number(mt.amount),
          count: mt.count,
        })),
      };
    }),
});
