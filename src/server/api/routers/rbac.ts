import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_INFO,
  hasPermission,
  canAssignRole,
  getNavPermissions,
} from "~/lib/rbac";

export const rbacRouter = createTRPCRouter({
  // Get user permissions for navigation
  getUserPermissions: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      return {
        role: userOrg.role,
        permissions: getNavPermissions(userOrg.role),
      };
    }),

  // Get all available roles with their information
  getAllRoles: publicProcedure.query(() => {
    return Object.entries(ROLE_INFO).map(([role, info]) => ({
      role: role as UserRole,
      ...info,
      permissions: ROLE_PERMISSIONS[role as UserRole] ?? [],
    }));
  }),

  // Get role information for a specific role
  getRoleInfo: publicProcedure
    .input(z.object({ role: z.nativeEnum(UserRole) }))
    .query(({ input }) => {
      return {
        role: input.role,
        ...ROLE_INFO[input.role],
        permissions: ROLE_PERMISSIONS[input.role] ?? [],
      };
    }),

  // Update user role in organization
  updateUserRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        targetUserId: z.string(),
        newRole: z.nativeEnum(UserRole),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if the requesting user has permission to assign roles
      const requestingUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      });

      if (!requestingUserOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      // Check if user can assign this role
      if (!canAssignRole(requestingUserOrg.role, input.newRole)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to assign this role",
        });
      }

      // Update the user's role
      const updatedUserOrg = await ctx.db.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: input.targetUserId,
            organizationId: input.organizationId,
          },
        },
        data: {
          role: input.newRole,
        },
      });

      return {
        success: true,
        updatedRole: updatedUserOrg.role,
      };
    }),

  // Get organization members with their roles
  getOrganizationMembers: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user has permission to view members
      const userOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
        },
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      // Check permissions
      if (
        !hasPermission(userOrg.role, PERMISSIONS.ORG_MEMBERS) &&
        !hasPermission(userOrg.role, PERMISSIONS.SETTINGS_READ)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to view organization members",
        });
      }

      // Get all organization members
      const members = await ctx.db.userOrganization.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Get user details for each member
      const userIds = members.map(member => member.userId);
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
          image: true,
        },
      });

      // Combine member data with user details and role information
      return members.map(member => {
        const user = users.find(u => u.id === member.userId);
        const roleInfo = ROLE_INFO[member.role];

        return {
          id: member.userId,
          userId: member.userId,
          role: member.role,
          roleInfo,
          joinedAt: member.joinedAt,
          canEdit: canAssignRole(userOrg.role, member.role),
          user: user ?? {
            id: member.userId,
            name: "Unknown User",
            email: "unknown@example.com",
            image: null,
          },
        };
      });
    }),
});
