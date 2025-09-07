import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "~/server/db";
import { UserRole } from "@prisma/client";

// Input schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  logo: z.string().optional(),
});

const updateOrganizationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Organization name is required").optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  logo: z.string().optional(),
});

export const organizationRouter = createTRPCRouter({
  // Get all organizations for a user
  getAll: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const organizations = await db.organization.findMany({
          where: {
            users: {
              some: {
                userId: input.userId,
              },
            },
          },
          include: {
            users: {
              select: {
                userId: true,
                role: true,
                joinedAt: true,
              },
            },
            _count: {
              select: {
                users: true,
                customers: true,
                projects: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return organizations.map(org => ({
          id: org.id,
          name: org.name,
          description: org.description,
          logo: org.logo,
          website: org.website,
          industry: org.industry,
          membersCount: org._count.users,
          customersCount: org._count.customers,
          projectsCount: org._count.projects,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
          userRole:
            org.users.find(u => u.userId === input.userId)?.role ??
            UserRole.VIEWER,
        }));
      } catch (error) {
        console.error("Error fetching organizations:", error);
        throw new Error("Failed to fetch organizations");
      }
    }),

  // Get organization by ID
  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const organization = await db.organization.findFirst({
          where: {
            id: input.id,
            users: {
              some: {
                userId: input.userId,
              },
            },
          },
          include: {
            users: {
              select: {
                userId: true,
                role: true,
                joinedAt: true,
              },
            },
            _count: {
              select: {
                users: true,
                customers: true,
                projects: true,
                tasks: true,
                invoices: true,
                expenses: true,
              },
            },
          },
        });

        if (!organization) {
          throw new Error("Organization not found or access denied");
        }

        return {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          logo: organization.logo,
          website: organization.website,
          industry: organization.industry,
          membersCount: organization._count.users,
          customersCount: organization._count.customers,
          projectsCount: organization._count.projects,
          tasksCount: organization._count.tasks,
          invoicesCount: organization._count.invoices,
          expensesCount: organization._count.expenses,
          createdAt: organization.createdAt.toISOString(),
          updatedAt: organization.updatedAt.toISOString(),
          userRole:
            organization.users.find(u => u.userId === input.userId)?.role ??
            UserRole.VIEWER,
        };
      } catch (error) {
        console.error("Error fetching organization:", error);
        throw new Error("Failed to fetch organization");
      }
    }),

  // Create new organization
  create: publicProcedure
    .input(createOrganizationSchema.extend({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const organization = await db.organization.create({
          data: {
            name: input.name,
            description: input.description,
            website: input.website,
            industry: input.industry,
            logo: input.logo,
            users: {
              create: {
                userId: input.userId,
                role: "ORGANIZATION_OWNER" as UserRole,
              },
            },
          },
          include: {
            users: {
              select: {
                userId: true,
                role: true,
                joinedAt: true,
              },
            },
            _count: {
              select: {
                users: true,
                customers: true,
                projects: true,
              },
            },
          },
        });

        return {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          logo: organization.logo,
          website: organization.website,
          industry: organization.industry,
          membersCount: organization._count.users,
          customersCount: organization._count.customers,
          projectsCount: organization._count.projects,
          createdAt: organization.createdAt.toISOString(),
          updatedAt: organization.updatedAt.toISOString(),
          userRole: "ORGANIZATION_OWNER" as UserRole,
        };
      } catch (error) {
        console.error("Error creating organization:", error);
        throw new Error("Failed to create organization");
      }
    }),

  // Update organization
  update: publicProcedure
    .input(updateOrganizationSchema.extend({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Check if user has permission to update - including users with SETTINGS_WRITE permission
        const userOrg = await db.userOrganization.findFirst({
          where: {
            userId: input.userId,
            organizationId: input.id,
          },
          include: {
            customRole: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        });

        if (!userOrg) {
          throw new Error("User is not a member of this organization");
        }

        // Check if user has permission to update organization settings
        let hasPermission = false;

        // Check predefined roles
        if (userOrg.role) {
          const allowedRoles: UserRole[] = [
            "ORGANIZATION_OWNER",
            "SUPER_ADMIN",
          ];
          hasPermission = allowedRoles.includes(userOrg.role);
        }

        // Check custom role permissions
        if (!hasPermission && userOrg.customRole) {
          const hasSettingsWrite = userOrg.customRole.permissions.some(
            rp =>
              rp.permission.name === "settings:write" ||
              rp.permission.name === "settings:admin"
          );
          hasPermission = hasSettingsWrite;
        }

        if (!hasPermission) {
          throw new Error(
            "Insufficient permissions to update organization settings"
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, userId: _userId, ...updateData } = input;
        const organization = await db.organization.update({
          where: { id },
          data: updateData,
          include: {
            users: {
              select: {
                userId: true,
                role: true,
                joinedAt: true,
              },
            },
            _count: {
              select: {
                users: true,
                customers: true,
                projects: true,
                tasks: true,
                invoices: true,
                expenses: true,
              },
            },
          },
        });

        return {
          id: organization.id,
          name: organization.name,
          description: organization.description,
          logo: organization.logo,
          website: organization.website,
          industry: organization.industry,
          membersCount: organization._count.users,
          customersCount: organization._count.customers,
          projectsCount: organization._count.projects,
          tasksCount: organization._count.tasks,
          invoicesCount: organization._count.invoices,
          expensesCount: organization._count.expenses,
          createdAt: organization.createdAt.toISOString(),
          updatedAt: organization.updatedAt.toISOString(),
          userRole: userOrg.role,
        };
      } catch (error) {
        console.error("Error updating organization:", error);
        throw new Error("Failed to update organization");
      }
    }),

  // Delete organization
  delete: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Check if user is owner
        const userOrg = await db.userOrganization.findFirst({
          where: {
            userId: input.userId,
            organizationId: input.id,
            role: "ORGANIZATION_OWNER" as UserRole,
          },
        });

        if (!userOrg) {
          throw new Error("Only organization owners can delete organizations");
        }

        await db.organization.delete({
          where: { id: input.id },
        });

        return { success: true };
      } catch (error) {
        console.error("Error deleting organization:", error);
        throw new Error("Failed to delete organization");
      }
    }),

  // Get organization members for assignment
  getMembers: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // First get the user organization relationships
        const userOrgs = await ctx.db.userOrganization.findMany({
          where: {
            organizationId: input.organizationId,
          },
        });

        // Then get the user details for each member
        const userIds = userOrgs.map(uo => uo.userId);
        const users = await ctx.db.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        // Combine the data
        return userOrgs.map(member => {
          const user = users.find(u => u.id === member.userId);
          return {
            id: member.userId,
            userId: member.userId,
            role: member.role,
            joinedAt: member.joinedAt,
            user: user ?? {
              id: member.userId,
              name: "Unknown User",
              email: "unknown@example.com",
            },
          };
        });
      } catch (error) {
        console.error("Error fetching organization members:", error);
        throw new Error("Failed to fetch organization members");
      }
    }),

  // Get organization stats
  getStats: publicProcedure
    .input(z.object({ organizationId: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      try {
        // Verify user has access
        const userOrg = await db.userOrganization.findFirst({
          where: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        });

        if (!userOrg) {
          throw new Error("Access denied");
        }

        const [
          totalCustomers,
          totalProjects,
          totalTasks,
          totalInvoices,
          totalExpenses,
          activeDeals,
        ] = await Promise.all([
          db.customer.count({
            where: { organizationId: input.organizationId },
          }),
          db.project.count({
            where: { organizationId: input.organizationId },
          }),
          db.task.count({
            where: { organizationId: input.organizationId },
          }),
          db.invoice.count({
            where: { organizationId: input.organizationId },
          }),
          db.expense.count({
            where: { organizationId: input.organizationId },
          }),
          db.deal.count({
            where: {
              customer: {
                organizationId: input.organizationId,
              },
              status: {
                in: [
                  "NEW",
                  "CONTACTED",
                  "QUALIFIED",
                  "PROPOSAL",
                  "NEGOTIATION",
                ],
              },
            },
          }),
        ]);

        return {
          totalCustomers,
          totalProjects,
          totalTasks,
          totalInvoices,
          totalExpenses,
          activeDeals,
        };
      } catch (error) {
        console.error("Error fetching organization stats:", error);
        throw new Error("Failed to fetch organization stats");
      }
    }),
});
