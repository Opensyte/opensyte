import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, hasPermission, canAssignRole } from "~/lib/rbac";
import {
  getUserEffectivePermissions,
  getUserRoleType,
  canManageCustomRoles,
  validateCustomRolePermissions,
  getCustomNavPermissions,
} from "~/lib/custom-rbac";
import type { ExtendedUserOrganization } from "~/types/custom-roles";

export const customRolesRouter = createTRPCRouter({
  // Get all available permissions for creating custom roles
  getAvailablePermissions: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user has permission to manage custom roles
      const userOrg = await ctx.db.userOrganization.findFirst({
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
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      const extendedUserOrg = userOrg as ExtendedUserOrganization;

      if (!canManageCustomRoles(extendedUserOrg)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to view available permissions",
        });
      }

      // Get all permissions from database
      const permissions = await ctx.db.permission.findMany({
        orderBy: [{ module: "asc" }, { action: "asc" }],
      });

      // Group permissions by module (client will receive real DB ids)
      const permissionGroups = permissions.reduce(
        (acc, permission) => {
          if (!acc[permission.module])
            acc[permission.module] = [] as typeof permissions;
          acc[permission.module]!.push(permission);
          return acc;
        },
        {} as Record<string, typeof permissions>
      );

      return Object.entries(permissionGroups).map(([module, perms]) => ({
        module,
        label: module.charAt(0).toUpperCase() + module.slice(1),
        permissions: perms,
      }));
    }),

  // Create a new custom role
  createCustomRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        name: z.string().min(1).max(50),
        description: z.string().optional(),
        color: z.string().default("bg-blue-100 text-blue-800"),
        // We receive permission IDs (DB primary keys) from the client
        permissionIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to create custom roles
      const userOrg = await ctx.db.userOrganization.findFirst({
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
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      const extendedUserOrg = userOrg as ExtendedUserOrganization;

      if (!canManageCustomRoles(extendedUserOrg)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to create custom roles",
        });
      }

      // Check if role name is unique within organization
      const existingRole = await ctx.db.customRole.findFirst({
        where: {
          organizationId: input.organizationId,
          name: input.name,
        },
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this name already exists",
        });
      }

      // Fetch permissions by provided IDs
      const dbPermissions = await ctx.db.permission.findMany({
        where: { id: { in: input.permissionIds } },
      });
      if (dbPermissions.length !== input.permissionIds.length) {
        const foundIds = new Set(dbPermissions.map(p => p.id));
        const missing = input.permissionIds.filter(p => !foundIds.has(p));
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `One or more permission IDs are invalid: ${missing.join(", ")}`,
        });
      }

      // Validate using permission names
      const validation = validateCustomRolePermissions(
        dbPermissions.map(p => p.name)
      );
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.errors.join(", "),
        });
      }

      // Create the custom role
      const customRole = await ctx.db.customRole.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          color: input.color,
          createdById: input.userId,
          permissions: {
            create: dbPermissions.map(p => ({ permissionId: p.id })),
          },
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      return customRole;
    }),

  // Get all custom roles for an organization
  getOrganizationCustomRoles: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Check if user has permission to view custom roles
      const userOrg = await ctx.db.userOrganization.findFirst({
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
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      const extendedUserOrg = userOrg as ExtendedUserOrganization;

      // Check if user can view roles (at least settings read permission)
      if (
        !hasPermission(userOrg.role ?? "VIEWER", PERMISSIONS.SETTINGS_READ) &&
        !getUserEffectivePermissions(extendedUserOrg).includes(
          PERMISSIONS.SETTINGS_READ
        )
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to view custom roles",
        });
      }

      const customRoles = await ctx.db.customRole.findMany({
        where: {
          organizationId: input.organizationId,
          isActive: true,
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: {
              userAssignments: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      return customRoles.map(role => ({
        ...role,
        permissionCount: role.permissions.length,
        userCount: role._count.userAssignments,
      }));
    }),

  // Update a custom role
  updateCustomRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        roleId: z.string(),
        name: z.string().min(1).max(50),
        description: z.string().optional(),
        color: z.string(),
        // We receive permission IDs (DB primary keys) from the client
        permissionIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to manage custom roles
      const userOrg = await ctx.db.userOrganization.findFirst({
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
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      const extendedUserOrg = userOrg as ExtendedUserOrganization;

      if (!canManageCustomRoles(extendedUserOrg)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to update custom roles",
        });
      }

      // Verify the role exists and belongs to the organization
      const existingRole = await ctx.db.customRole.findFirst({
        where: {
          id: input.roleId,
          organizationId: input.organizationId,
        },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom role not found",
        });
      }

      // Check if name is unique (excluding current role)
      const nameConflict = await ctx.db.customRole.findFirst({
        where: {
          organizationId: input.organizationId,
          name: input.name,
          id: {
            not: input.roleId,
          },
        },
      });

      if (nameConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this name already exists",
        });
      }

      // Fetch permissions by provided IDs
      const dbPermissions = await ctx.db.permission.findMany({
        where: { id: { in: input.permissionIds } },
      });
      if (dbPermissions.length !== input.permissionIds.length) {
        const foundIds = new Set(dbPermissions.map(p => p.id));
        const missing = input.permissionIds.filter(p => !foundIds.has(p));
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `One or more permission IDs are invalid: ${missing.join(", ")}`,
        });
      }
      const validation = validateCustomRolePermissions(
        dbPermissions.map(p => p.name)
      );
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.errors.join(", "),
        });
      }

      // Update the role and its permissions
      const updatedRole = await ctx.db.$transaction(async tx => {
        // Delete existing permissions
        await tx.customRolePermission.deleteMany({
          where: {
            customRoleId: input.roleId,
          },
        });

        // Update the role
        const role = await tx.customRole.update({
          where: {
            id: input.roleId,
          },
          data: {
            name: input.name,
            description: input.description,
            color: input.color,
          },
        });

        await tx.customRolePermission.createMany({
          data: input.permissionIds.map(permissionId => ({
            customRoleId: input.roleId,
            permissionId,
          })),
        });

        return role;
      });

      return updatedRole;
    }),

  // Delete a custom role
  deleteCustomRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        roleId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to manage custom roles
      const userOrg = await ctx.db.userOrganization.findFirst({
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
      });

      if (!userOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      const extendedUserOrg = userOrg as ExtendedUserOrganization;

      if (!canManageCustomRoles(extendedUserOrg)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions to delete custom roles",
        });
      }

      // Verify the role exists and belongs to the organization
      const existingRole = await ctx.db.customRole.findFirst({
        where: {
          id: input.roleId,
          organizationId: input.organizationId,
        },
        include: {
          _count: {
            select: {
              userAssignments: true,
            },
          },
        },
      });

      if (!existingRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom role not found",
        });
      }

      // Check if role is currently assigned to users
      if (existingRole._count.userAssignments > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete role that is currently assigned to users",
        });
      }

      // Delete the role (cascading delete will handle permissions)
      await ctx.db.customRole.delete({
        where: {
          id: input.roleId,
        },
      });

      return { success: true };
    }),

  // Assign a role (predefined or custom) to a user
  assignUserRole: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        targetUserId: z.string(),
        roleAssignment: z.union([
          z.object({
            type: z.literal("predefined"),
            role: z.nativeEnum(UserRole),
          }),
          z.object({
            type: z.literal("custom"),
            customRoleId: z.string(),
          }),
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check permissions for the requesting user
      const requestingUserOrg = await ctx.db.userOrganization.findFirst({
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
      });

      if (!requestingUserOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      // Verify target user exists in organization
      const targetUserOrg = await ctx.db.userOrganization.findFirst({
        where: {
          userId: input.targetUserId,
          organizationId: input.organizationId,
        },
      });

      if (!targetUserOrg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user not found in organization",
        });
      }

      const extendedRequestingUserOrg =
        requestingUserOrg as ExtendedUserOrganization;

      // Check if requesting user can assign roles
      if (input.roleAssignment.type === "predefined") {
        if (
          requestingUserOrg.role &&
          !canAssignRole(requestingUserOrg.role, input.roleAssignment.role)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient permissions to assign this role",
          });
        }
      } else {
        // For custom roles, check if user has member management permissions
        if (
          !getUserEffectivePermissions(extendedRequestingUserOrg).includes(
            PERMISSIONS.ORG_MEMBERS
          )
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient permissions to assign custom roles",
          });
        }

        // Verify custom role exists and belongs to organization
        const customRole = await ctx.db.customRole.findFirst({
          where: {
            id: input.roleAssignment.customRoleId,
            organizationId: input.organizationId,
            isActive: true,
          },
        });

        if (!customRole) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Custom role not found",
          });
        }
      }

      // Update user role assignment
      const updatedUserOrg = await ctx.db.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: input.targetUserId,
            organizationId: input.organizationId,
          },
        },
        data: {
          role:
            input.roleAssignment.type === "predefined"
              ? input.roleAssignment.role
              : null,
          customRoleId:
            input.roleAssignment.type === "custom"
              ? input.roleAssignment.customRoleId
              : null,
        },
      });

      return { success: true, updatedRole: updatedUserOrg };
    }),

  // Get enhanced user permissions for navigation (supports custom roles)
  getEnhancedUserPermissions: publicProcedure
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in organization",
        });
      }

      const extendedUserOrg = userOrg as ExtendedUserOrganization;
      const roleType = getUserRoleType(extendedUserOrg);
      const navPermissions = getCustomNavPermissions(extendedUserOrg);

      return {
        roleType,
        permissions: navPermissions,
        effectivePermissions: getUserEffectivePermissions(extendedUserOrg),
      };
    }),
});
