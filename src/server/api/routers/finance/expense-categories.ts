import { z } from "zod";
import {
  createTRPCRouter,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";

export const expenseCategoriesRouter = createTRPCRouter({
  list: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      return db.expenseCategory.findMany({
        where: { organizationId: input.organizationId, isActive: true },
        orderBy: { name: "asc" },
      });
    }),

  create: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().default("bg-blue-100 text-blue-800"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      return db.expenseCategory.create({
        data: input,
      });
    }),

  update: createAnyPermissionProcedure([
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.FINANCE_ADMIN,
  ])
    .input(
      z.object({
        id: z.string(),
        organizationId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.requireAnyPermission(input.organizationId);
      const { id, organizationId, ...data } = input;
      return db.expenseCategory.update({
        where: { id, organizationId },
        data,
      });
    }),

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
      // Soft delete by setting isActive to false
      return db.expenseCategory.update({
        where: { id: input.id, organizationId: input.organizationId },
        data: { isActive: false },
      });
    }),
});
