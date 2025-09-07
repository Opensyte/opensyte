import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_INFO,
  hasPermission,
  canAssignRole as canAssignRoleBasic,
} from "~/lib/rbac";
import { canAssignRole, hasAnyPermission } from "~/lib/custom-rbac";
import type { ExtendedUserOrganization } from "~/types/custom-roles";

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
      const userOrg = (await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
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
      })) as ExtendedUserOrganization | null;

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      // Convert to navigation permissions format using hasAnyPermission
      const navPermissions = {
        canViewCRM: hasAnyPermission(userOrg, [
          PERMISSIONS.CRM_READ,
          PERMISSIONS.CRM_WRITE,
          PERMISSIONS.CRM_ADMIN,
        ]),
        canViewProjects: hasAnyPermission(userOrg, [
          PERMISSIONS.PROJECTS_READ,
          PERMISSIONS.PROJECTS_WRITE,
          PERMISSIONS.PROJECTS_ADMIN,
        ]),
        canViewFinance: hasAnyPermission(userOrg, [
          PERMISSIONS.FINANCE_READ,
          PERMISSIONS.FINANCE_WRITE,
          PERMISSIONS.FINANCE_ADMIN,
        ]),
        canViewHR: hasAnyPermission(userOrg, [
          PERMISSIONS.HR_READ,
          PERMISSIONS.HR_WRITE,
          PERMISSIONS.HR_ADMIN,
        ]),
        canViewMarketing: hasAnyPermission(userOrg, [
          PERMISSIONS.MARKETING_READ,
          PERMISSIONS.MARKETING_WRITE,
          PERMISSIONS.MARKETING_ADMIN,
        ]),
        canViewCollaboration: hasAnyPermission(userOrg, [
          PERMISSIONS.COLLABORATION_READ,
          PERMISSIONS.COLLABORATION_WRITE,
        ]),
        canViewSettings: hasAnyPermission(userOrg, [
          PERMISSIONS.SETTINGS_READ,
          PERMISSIONS.SETTINGS_WRITE,
          PERMISSIONS.SETTINGS_ADMIN,
        ]),
        canWriteCRM: hasAnyPermission(userOrg, [
          PERMISSIONS.CRM_WRITE,
          PERMISSIONS.CRM_ADMIN,
        ]),
        canWriteProjects: hasAnyPermission(userOrg, [
          PERMISSIONS.PROJECTS_WRITE,
          PERMISSIONS.PROJECTS_ADMIN,
        ]),
        canWriteFinance: hasAnyPermission(userOrg, [
          PERMISSIONS.FINANCE_WRITE,
          PERMISSIONS.FINANCE_ADMIN,
        ]),
        canWriteHR: hasAnyPermission(userOrg, [
          PERMISSIONS.HR_WRITE,
          PERMISSIONS.HR_ADMIN,
        ]),
        canWriteMarketing: hasAnyPermission(userOrg, [
          PERMISSIONS.MARKETING_WRITE,
          PERMISSIONS.MARKETING_ADMIN,
        ]),
        canWriteCollaboration: hasAnyPermission(userOrg, [
          PERMISSIONS.COLLABORATION_WRITE,
        ]),
        canWriteSettings: hasAnyPermission(userOrg, [
          PERMISSIONS.SETTINGS_WRITE,
          PERMISSIONS.SETTINGS_ADMIN,
        ]),
        canManageOrganization: hasAnyPermission(userOrg, [
          PERMISSIONS.ORG_ADMIN,
        ]),
        canManageMembers: hasAnyPermission(userOrg, [PERMISSIONS.ORG_MEMBERS]),
        canManageBilling: hasAnyPermission(userOrg, [PERMISSIONS.ORG_BILLING]),
      };

      return {
        role: userOrg.role,
        customRole: userOrg.customRole,
        permissions: navPermissions,
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
      if (
        !requestingUserOrg.role ||
        !canAssignRoleBasic(requestingUserOrg.role, input.newRole)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to assign this role",
        });
      }

      // Update the user's role (clear custom role when assigning predefined role)
      const updatedUserOrg = await ctx.db.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: input.targetUserId,
            organizationId: input.organizationId,
          },
        },
        data: {
          role: input.newRole,
          customRoleId: null, // Clear custom role when assigning predefined role
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
        !userOrg.role ||
        (!hasPermission(userOrg.role, PERMISSIONS.ORG_MEMBERS) &&
          !hasPermission(userOrg.role, PERMISSIONS.SETTINGS_READ))
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
          customRole: true,
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
        const roleInfo = member.role ? ROLE_INFO[member.role] : null;

        // Determine if current user can edit this member based on custom RBAC
        const extendedUserOrg = userOrg as ExtendedUserOrganization;
        const extendedMember = member as ExtendedUserOrganization;
        let canEditMember = false;

        if (extendedMember.customRoleId && extendedMember.customRole) {
          // Target has custom role - check if current user can assign custom roles
          const targetRoleAssignment = {
            type: "custom" as const,
            customRoleId: extendedMember.customRoleId, // TypeScript knows this is defined due to the condition
          };
          canEditMember = canAssignRole(extendedUserOrg, targetRoleAssignment);
        } else if (member.role) {
          // Target has predefined role - check assignment permissions
          const targetRoleAssignment = {
            type: "predefined" as const,
            role: member.role,
          };
          canEditMember = canAssignRole(extendedUserOrg, targetRoleAssignment);
        } else {
          // Target has no role - any user with member management can assign
          canEditMember = hasAnyPermission(extendedUserOrg, [
            PERMISSIONS.ORG_ADMIN,
            PERMISSIONS.ORG_MEMBERS,
          ]);
        }

        return {
          id: member.userId,
          userId: member.userId,
          role: member.role,
          customRoleId: extendedMember.customRoleId,
          customRole: extendedMember.customRole,
          roleInfo,
          joinedAt: member.joinedAt,
          canEdit: canEditMember,
          user: user ?? {
            id: member.userId,
            name: "Unknown User",
            email: "unknown@example.com",
            image: null,
          },
        };
      });
    }),

  // Remove member from organization
  removeMember: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        targetUserId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if the requesting user has permission to remove members
      const requestingUserOrg = (await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
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
      })) as ExtendedUserOrganization | null;

      if (!requestingUserOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      // Check permissions using custom RBAC
      const canRemoveMembers = hasAnyPermission(requestingUserOrg, [
        PERMISSIONS.ORG_ADMIN,
        PERMISSIONS.ORG_MEMBERS,
      ]);

      if (!canRemoveMembers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to remove members",
        });
      }

      // Prevent removing yourself
      if (input.userId === input.targetUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the organization",
        });
      }

      // Get the target user's organization membership
      const targetUserOrg = (await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.targetUserId,
          organizationId: input.organizationId,
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
      })) as ExtendedUserOrganization | null;

      if (!targetUserOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user not found in organization",
        });
      }

      // Prevent removing organization owner unless you are also an owner
      if (targetUserOrg.role === "ORGANIZATION_OWNER") {
        if (requestingUserOrg.role !== "ORGANIZATION_OWNER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only organization owners can remove other owners",
          });
        }

        // Check if this is the last owner
        const ownerCount = await ctx.db.userOrganization.count({
          where: {
            organizationId: input.organizationId,
            role: "ORGANIZATION_OWNER",
          },
        });

        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove the last organization owner",
          });
        }
      }

      // Check if requesting user has higher privileges than target for custom roles
      if (targetUserOrg.customRoleId && targetUserOrg.customRole) {
        const targetRoleAssignment = {
          type: "custom" as const,
          customRoleId: targetUserOrg.customRoleId,
        };

        if (!canAssignRole(requestingUserOrg, targetRoleAssignment)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot remove user with higher or equal privileges",
          });
        }
      } else if (targetUserOrg.role) {
        const targetRoleAssignment = {
          type: "predefined" as const,
          role: targetUserOrg.role,
        };

        if (!canAssignRole(requestingUserOrg, targetRoleAssignment)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot remove user with higher or equal privileges",
          });
        }
      }

      // Remove the user from the organization
      await ctx.db.userOrganization.delete({
        where: {
          userId_organizationId: {
            userId: input.targetUserId,
            organizationId: input.organizationId,
          },
        },
      });

      return {
        success: true,
        message: "Member removed successfully",
      };
    }),
});
