import { z } from "zod";
import {
  createTRPCRouter,
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "../../trpc";
import {
  CustomerUncheckedCreateInputSchema,
  CustomerUpdateInputSchema,
} from "prisma/generated/zod";
import { db } from "~/server/db";
import { PERMISSIONS } from "~/lib/rbac";

export const contactsCrmRoutes = createTRPCRouter({
  // Create a new contact
  createContact: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(CustomerUncheckedCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user has permission to write to this organization
        await ctx.requirePermission(input.organizationId);

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
      } catch (error) {
        console.error("Failed to create contact:", error);
        throw new Error("Failed to create contact");
      }
    }),

  // Get a single contact by ID
  getContactById: createAnyPermissionProcedure([
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.CRM_ADMIN,
  ])
    .input(
      z.object({ id: z.string().cuid(), organizationId: z.string().cuid() })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has permission to read from this organization
        await ctx.requireAnyPermission(input.organizationId);

        const contact = await db.customer.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
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
          },
        });

        if (!contact) {
          throw new Error("Contact not found or access denied");
        }

        return contact;
      } catch (error) {
        console.error("Failed to fetch contact:", error);
        throw new Error("Failed to fetch contact");
      }
    }),

  // Update a contact
  updateContact: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
        data: CustomerUpdateInputSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user has permission to write to this organization
        await ctx.requirePermission(input.organizationId);

        // Verify contact belongs to the organization
        const existingContact = await db.customer.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!existingContact) {
          throw new Error("Contact not found or access denied");
        }

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
      } catch (error) {
        console.error("Failed to update contact:", error);
        throw new Error("Failed to update contact");
      }
    }),

  // Delete a contact
  deleteContact: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      z.object({
        id: z.string().cuid(),
        organizationId: z.string().cuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Verify user has permission to write to this organization
        await ctx.requirePermission(input.organizationId);

        // Verify contact belongs to the organization
        const existingContact = await db.customer.findFirst({
          where: {
            id: input.id,
            organizationId: input.organizationId,
          },
        });

        if (!existingContact) {
          throw new Error("Contact not found or access denied");
        }

        const contact = await db.customer.delete({
          where: { id: input.id },
        });

        return { success: true, deletedId: contact.id };
      } catch (error) {
        console.error("Failed to delete contact:", error);
        throw new Error("Failed to delete contact");
      }
    }),

  // Get contacts by organization
  getContactsByOrganization: createAnyPermissionProcedure([
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.CRM_ADMIN,
  ])
    .input(
      z.object({
        organizationId: z.string().cuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Verify user has permission to read from this organization
        await ctx.requireAnyPermission(input.organizationId);

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
              },
            },
          },
        });

        return contacts;
      } catch (error) {
        console.error("Failed to fetch contacts by organization:", error);
        throw new Error("Failed to fetch contacts by organization");
      }
    }),
});
