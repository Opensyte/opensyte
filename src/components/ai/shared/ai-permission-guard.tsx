"use client";

import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import type { ReactNode } from "react";

interface AIPermissionGuardProps {
  children: ReactNode;
  requiredPermissions?: string[];
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

export function AIPermissionGuard({
  children,
  requiredPermissions,
  fallback,
  loadingComponent,
}: AIPermissionGuardProps) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={
        requiredPermissions ?? [
          PERMISSIONS.AI_READ,
          PERMISSIONS.AI_WRITE,
          PERMISSIONS.AI_ADMIN,
        ]
      }
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </ClientPermissionGuard>
  );
}

// Specific permission guards for different AI features
export function AIReadPermissionGuard({
  children,
  fallback,
  loadingComponent,
}: Omit<AIPermissionGuardProps, "requiredPermissions">) {
  return (
    <AIPermissionGuard
      requiredPermissions={[PERMISSIONS.AI_READ]}
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </AIPermissionGuard>
  );
}

export function AIWritePermissionGuard({
  children,
  fallback,
  loadingComponent,
}: Omit<AIPermissionGuardProps, "requiredPermissions">) {
  return (
    <AIPermissionGuard
      requiredPermissions={[PERMISSIONS.AI_WRITE, PERMISSIONS.AI_ADMIN]}
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </AIPermissionGuard>
  );
}

export function AIAdminPermissionGuard({
  children,
  fallback,
  loadingComponent,
}: Omit<AIPermissionGuardProps, "requiredPermissions">) {
  return (
    <AIPermissionGuard
      requiredPermissions={[PERMISSIONS.AI_ADMIN]}
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </AIPermissionGuard>
  );
}

// Helper function for inline permission checking
export function withAIPermissions(
  children: ReactNode,
  permissionLevel: "read" | "write" | "admin" = "read"
) {
  switch (permissionLevel) {
    case "admin":
      return <AIAdminPermissionGuard>{children}</AIAdminPermissionGuard>;
    case "write":
      return <AIWritePermissionGuard>{children}</AIWritePermissionGuard>;
    case "read":
    default:
      return <AIReadPermissionGuard>{children}</AIReadPermissionGuard>;
  }
}
