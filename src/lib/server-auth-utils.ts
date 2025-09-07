import { type UserRole } from "@prisma/client";
import { db } from "~/server/db";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { getNavPermissions } from "~/lib/rbac";
import type { ExtendedUserOrganization } from "~/types/custom-roles";
import { getCustomNavPermissions } from "~/lib/custom-rbac";

/**
 * Get the current user's role for a specific organization
 * Returns null if user is not authenticated or not a member of the organization
 */
export async function getUserOrganizationRole(
  organizationId: string
): Promise<UserRole | null> {
  try {
    // Get the current session
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return null;
    }

    // Find the user's role in the organization
    const userOrg = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
      },
      select: {
        role: true,
      },
    });

    return userOrg?.role ?? null;
  } catch (error) {
    console.error("Error getting user organization role:", error);
    return null;
  }
}

/**
 * Get the current authenticated user's ID
 * Returns null if user is not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

/**
 * Check if the current user has access to an organization
 * Returns true if user is a member of the organization
 */
export async function hasOrganizationAccess(
  organizationId: string
): Promise<boolean> {
  const role = await getUserOrganizationRole(organizationId);
  return role !== null;
}

/**
 * Get the first authorized module path for a user in an organization
 * Returns the path to the first module the user has access to
 */
export async function getFirstAuthorizedModulePath(
  organizationId: string
): Promise<string> {
  try {
    // Get the current session
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return "crm/contacts"; // Default fallback
    }

    // Get user organization with custom role details
    const userOrg = (await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
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
      return "crm/contacts"; // Default fallback
    }

    // Get navigation permissions based on role type
    let navPermissions;
    if (userOrg.customRole) {
      navPermissions = getCustomNavPermissions(userOrg);
    } else if (userOrg.role) {
      navPermissions = getNavPermissions(userOrg.role);
    } else {
      // Fallback for null role (shouldn't happen in normal flow)
      return "crm/contacts";
    }

    // Define module priorities and their default paths
    const moduleChecks = [
      {
        check: navPermissions.canViewCRM,
        path: "crm/contacts",
      },
      {
        check: navPermissions.canViewProjects,
        path: "projects",
      },
      {
        check: navPermissions.canViewFinance,
        path: "finance/invoices",
      },
      {
        check: navPermissions.canViewHR,
        path: "hr/employees",
      },
      {
        check: navPermissions.canViewCollaboration,
        path: "chat",
      },
      {
        check: navPermissions.canViewMarketing,
        path: "marketing",
      },
      {
        check: navPermissions.canViewSettings,
        path: "settings/team",
      },
    ];

    // Find the first module the user has access to
    for (const moduleCheck of moduleChecks) {
      if (moduleCheck.check) {
        return moduleCheck.path;
      }
    }

    // Default fallback if no permissions found (shouldn't happen in normal flow)
    return "crm/contacts";
  } catch (error) {
    console.error("Error getting first authorized module path:", error);
    return "crm/contacts"; // Default fallback
  }
}
