"use client";

import { ClientPermissionGuard } from "../client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface ProjectPermissionWrapperProps {
  children: React.ReactNode;
}

export function ProjectPermissionWrapper({
  children,
}: ProjectPermissionWrapperProps) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.PROJECTS_READ,
        PERMISSIONS.PROJECTS_WRITE,
        PERMISSIONS.PROJECTS_ADMIN,
      ]}
    >
      {children}
    </ClientPermissionGuard>
  );
}
