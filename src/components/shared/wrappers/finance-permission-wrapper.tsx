"use client";

import { ClientPermissionGuard } from "../client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface FinancePermissionWrapperProps {
  children: React.ReactNode;
}

export function FinancePermissionWrapper({
  children,
}: FinancePermissionWrapperProps) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.FINANCE_WRITE,
        PERMISSIONS.FINANCE_ADMIN,
      ]}
    >
      {children}
    </ClientPermissionGuard>
  );
}
