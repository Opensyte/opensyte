import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  CustomerInteractionUncheckedCreateInputSchema,
  CustomerInteractionUpdateInputSchema,
} from "prisma/generated/zod";
import { db } from "~/server/db";

export const interactionsRouter = createTRPCRouter({
  // Fetch all interactions for an organization
  getByOrganization: publicProcedure
    .input(z.object({ organizationId: z.string().cuid() }))
    .query(({ input }) => {
      return db.customerInteraction.findMany({
        where: { customer: { organizationId: input.organizationId } },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Fetch a single interaction by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      const interaction = await db.customerInteraction.findUnique({
        where: { id: input.id },
      });
      if (!interaction) {
        throw new Error("Interaction not found");
      }
      return interaction;
    }),

  // Create a new interaction
  createInteraction: publicProcedure
    .input(CustomerInteractionUncheckedCreateInputSchema)
    .mutation(async ({ input }) => {
      return db.customerInteraction.create({
        data: input,
      });
    }),

  // Update an existing interaction
  updateInteraction: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: CustomerInteractionUpdateInputSchema,
      }),
    )
    .mutation(async ({ input }) => {
      return db.customerInteraction.update({
        where: { id: input.id },
        data: input.data,
      });
    }),

  // Delete an interaction
  deleteInteraction: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      await db.customerInteraction.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});
