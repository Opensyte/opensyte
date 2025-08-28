"use client";

import { ClientPermissionGuard } from "../client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface HRPermissionWrapperProps {
  children: React.ReactNode;
}

export function HRPermissionWrapper({ children }: HRPermissionWrapperProps) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.HR_READ,
        PERMISSIONS.HR_WRITE,
        PERMISSIONS.HR_ADMIN,
      ]}
    >
      {children}
    </ClientPermissionGuard>
  );
}
