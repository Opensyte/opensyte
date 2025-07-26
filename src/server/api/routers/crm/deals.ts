import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { db } from "~/server/db";

// Deal status enum for validation (matching Prisma LeadStatus)
const DealStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
]);

export const dealsCrmRoutes = createTRPCRouter({
  // Get deals by organization
  getDealsByOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const deals = await db.deal.findMany({
          where: {
            customer: {
              organizationId: input.organizationId,
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return deals;
      } catch (error) {
        console.error("Failed to fetch deals:", error);
        throw new Error("Failed to fetch deals by organization");
      }
    }),

  // Create a new deal
  createDeal: publicProcedure
    .input(
      z.object({
        customerId: z.string().cuid(),
        title: z.string().min(1, "Title is required"),
        value: z.number().min(0, "Value must be positive"),
        status: DealStatusSchema,
        stage: z.number().min(1).max(5),
        probability: z.number().min(0).max(100).optional(),
        currency: z.string().default("USD"),
        expectedCloseDate: z.date().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const deal = await db.deal.create({
          data: input,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });

        return deal;
      } catch (error) {
        console.error("Failed to create deal:", error);
        throw new Error("Failed to create deal");
      }
    }),

  // Update a deal
  updateDeal: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        title: z.string().min(1, "Title is required"),
        value: z.number().min(0, "Value must be positive"),
        customerId: z.string().cuid("Valid customer ID is required"),
        customerName: z.string().min(1, "Customer name is required"),
        status: DealStatusSchema,
        stage: z.number().min(0),
        probability: z.number().min(0).max(100).optional(),
        expectedCloseDate: z.date().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // First verify the deal belongs to the specified organization
        const existingDeal = await db.deal.findFirst({
          where: {
            id: input.id,
            customer: {
              organizationId: input.organizationId,
            },
          },
          include: {
            customer: true,
          },
        });

        if (!existingDeal) {
          throw new Error(
            "Deal not found or does not belong to this organization",
          );
        }

        const deal = await db.deal.update({
          where: { id: input.id },
          data: {
            title: input.title,
            value: input.value,
            customerId: input.customerId,
            status: input.status,
            stage: input.stage,
            probability: input.probability,
            expectedCloseDate: input.expectedCloseDate,
            description: input.description,
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });

        return deal;
      } catch (error) {
        console.error("Failed to update deal:", error);
        throw new Error("Failed to update deal");
      }
    }),

  // Delete a deal
  deleteDeal: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // First verify the deal belongs to the specified organization
        const existingDeal = await db.deal.findFirst({
          where: {
            id: input.id,
            customer: {
              organizationId: input.organizationId,
            },
          },
        });

        if (!existingDeal) {
          throw new Error(
            "Deal not found or does not belong to this organization",
          );
        }

        const deal = await db.deal.delete({
          where: { id: input.id },
        });

        return { success: true, deletedId: deal.id };
      } catch (error) {
        console.error("Failed to delete deal:", error);
        throw new Error("Failed to delete deal");
      }
    }),

  // Get a single deal by ID
  getDealById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      try {
        const deal = await db.deal.findUnique({
          where: { id: input.id },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
          },
        });

        if (!deal) {
          throw new Error("Deal not found");
        }

        return deal;
      } catch (error) {
        console.error("Failed to fetch deal:", error);
        throw new Error("Failed to fetch deal");
      }
    }),
});
