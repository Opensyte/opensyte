"use client";

import type { ReactNode } from "react";
import type { UserRole } from "@prisma/client";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "~/lib/rbac";

interface PermissionGuardProps {
  userRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
  // One of these should be provided
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
}

export function PermissionGuard({
  userRole,
  children,
  fallback = null,
  permission,
  anyPermissions,
  allPermissions,
}: PermissionGuardProps) {
  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(userRole, permission);
  } else if (anyPermissions) {
    hasAccess = hasAnyPermission(userRole, anyPermissions);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(userRole, allPermissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience hook for checking permissions in components
export function usePermissions(userRole: UserRole) {
  return {
    hasPermission: (permission: string) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: string[]) =>
      hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: string[]) =>
      hasAllPermissions(userRole, permissions),
  };
}
