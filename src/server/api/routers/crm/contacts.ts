import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import {
  CustomerUncheckedCreateInputSchema,
  CustomerUpdateInputSchema,
} from "prisma/generated/zod";
import { db } from "~/server/db";

export const contactsCrmRoutes = createTRPCRouter({
  // Create a new contact
  createContact: publicProcedure
    .input(CustomerUncheckedCreateInputSchema)
    .mutation(async ({ input }) => {
      try {
        const contact = await db.customer.create({
          data: input,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
        return contact;
      } catch {
        throw new Error("Failed to create contact");
      }
    }),

  // Get a single contact by ID
  getContactById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input }) => {
      try {
        const contact = await db.customer.findUnique({
          where: { id: input.id },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
            interactions: {
              orderBy: { createdAt: "desc" },
            },
            deals: {
              orderBy: { createdAt: "desc" },
            },
            invoices: {
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!contact) {
          throw new Error("Contact not found");
        }

        return contact;
      } catch {
        throw new Error("Failed to fetch contact");
      }
    }),

  // Update a contact
  updateContact: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: CustomerUpdateInputSchema,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const contact = await db.customer.update({
          where: { id: input.id },
          data: input.data,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return contact;
      } catch {
        throw new Error("Failed to update contact");
      }
    }),

  // Delete a contact
  deleteContact: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input }) => {
      try {
        const contact = await db.customer.delete({
          where: { id: input.id },
        });

        return { success: true, deletedId: contact.id };
      } catch {
        throw new Error("Failed to delete contact");
      }
    }),

  // Get contacts by organization
  getContactsByOrganization: publicProcedure
    .input(
      z.object({
        organizationId: z.string().cuid(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const contacts = await db.customer.findMany({
          where: {
            organizationId: input.organizationId,
          },
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                interactions: true,
                deals: true,
                invoices: true,
              },
            },
          },
        });

        return contacts;
      } catch {
        throw new Error("Failed to fetch contacts by organization");
      }
    }),
});
