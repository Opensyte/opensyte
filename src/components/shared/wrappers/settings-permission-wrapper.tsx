"use client";

import { ClientPermissionGuard } from "../client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface SettingsPermissionWrapperProps {
  children: React.ReactNode;
}

export function SettingsPermissionWrapper({
  children,
}: SettingsPermissionWrapperProps) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_WRITE,
        PERMISSIONS.SETTINGS_ADMIN,
      ]}
    >
      {children}
    </ClientPermissionGuard>
  );
}
