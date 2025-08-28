"use client";

import { ClientPermissionGuard } from "../client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface CRMPermissionWrapperProps {
  children: React.ReactNode;
}

export function CRMPermissionWrapper({ children }: CRMPermissionWrapperProps) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.CRM_READ,
        PERMISSIONS.CRM_WRITE,
        PERMISSIONS.CRM_ADMIN,
      ]}
    >
      {children}
    </ClientPermissionGuard>
  );
}
