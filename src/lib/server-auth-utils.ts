import { type UserRole } from "@prisma/client";
import { db } from "~/server/db";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";

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
