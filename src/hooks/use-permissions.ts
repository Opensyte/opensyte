"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import {
  getNavPermissions,
  hasPermission,
  hasAnyPermission,
  canWriteToModule,
  canReadFromModule,
  PERMISSIONS,
} from "~/lib/rbac";

export interface UsePermissionsProps {
  userId: string;
  organizationId: string;
}

export function usePermissions({
  userId,
  organizationId,
}: UsePermissionsProps) {
  const { data: userPermissions, isLoading } =
    api.rbac.getUserPermissions.useQuery({
      userId,
      organizationId,
    });

  const permissions = useMemo(() => {
    if (!userPermissions?.role) {
      return {
        role: null,
        // CRM permissions
        canViewCRM: false,
        canReadCRM: false,
        canWriteCRM: false,
        canAdminCRM: false,

        // HR permissions
        canViewHR: false,
        canReadHR: false,
        canWriteHR: false,
        canAdminHR: false,

        // Finance permissions
        canViewFinance: false,
        canReadFinance: false,
        canWriteFinance: false,
        canAdminFinance: false,

        // Projects permissions
        canViewProjects: false,
        canReadProjects: false,
        canWriteProjects: false,
        canAdminProjects: false,

        // Marketing permissions
        canViewMarketing: false,
        canReadMarketing: false,
        canWriteMarketing: false,
        canAdminMarketing: false,

        // Settings permissions
        canViewSettings: false,
        canReadSettings: false,
        canWriteSettings: false,
        canAdminSettings: false,

        // Organization permissions
        canManageOrganization: false,
        canManageMembers: false,
        canManageBilling: false,

        // Helper functions
        hasPermission: () => false,
        hasAnyPermission: () => false,
        canWriteToModule: () => false,
        canReadFromModule: () => false,
      };
    }

    const role = userPermissions.role;
    const navPermissions = getNavPermissions(role);

    return {
      role,
      // CRM permissions
      canViewCRM: navPermissions.canViewCRM,
      canReadCRM: canReadFromModule(role, "crm"),
      canWriteCRM: canWriteToModule(role, "crm"),
      canAdminCRM: hasPermission(role, PERMISSIONS.CRM_ADMIN),

      // HR permissions
      canViewHR: navPermissions.canViewHR,
      canReadHR: canReadFromModule(role, "hr"),
      canWriteHR: canWriteToModule(role, "hr"),
      canAdminHR: hasPermission(role, PERMISSIONS.HR_ADMIN),

      // Finance permissions
      canViewFinance: navPermissions.canViewFinance,
      canReadFinance: canReadFromModule(role, "finance"),
      canWriteFinance: canWriteToModule(role, "finance"),
      canAdminFinance: hasPermission(role, PERMISSIONS.FINANCE_ADMIN),

      // Projects permissions
      canViewProjects: navPermissions.canViewProjects,
      canReadProjects: canReadFromModule(role, "projects"),
      canWriteProjects: canWriteToModule(role, "projects"),
      canAdminProjects: hasPermission(role, PERMISSIONS.PROJECTS_ADMIN),

      // Marketing permissions
      canViewMarketing: navPermissions.canViewMarketing,
      canReadMarketing: canReadFromModule(role, "marketing"),
      canWriteMarketing: canWriteToModule(role, "marketing"),
      canAdminMarketing: hasPermission(role, PERMISSIONS.MARKETING_ADMIN),

      // Settings permissions
      canViewSettings: navPermissions.canViewSettings,
      canReadSettings: canReadFromModule(role, "settings"),
      canWriteSettings: canWriteToModule(role, "settings"),
      canAdminSettings: hasPermission(role, PERMISSIONS.SETTINGS_ADMIN),

      // Organization permissions
      canManageOrganization: navPermissions.canManageOrganization,
      canManageMembers: navPermissions.canManageMembers,
      canManageBilling: navPermissions.canManageBilling,

      // Helper functions
      hasPermission: (permission: string) => hasPermission(role, permission),
      hasAnyPermission: (permissions: string[]) =>
        hasAnyPermission(role, permissions),
      canWriteToModule: (
        module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
      ) => canWriteToModule(role, module),
      canReadFromModule: (
        module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
      ) => canReadFromModule(role, module),
    };
  }, [userPermissions?.role]);

  return {
    ...permissions,
    isLoading,
    isError: !userPermissions && !isLoading,
  };
}

// Simplified hook for just checking if user can perform an action in a specific module
export function useModulePermissions(
  userId: string,
  organizationId: string,
  module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
) {
  const permissions = usePermissions({ userId, organizationId });

  return {
    canRead: permissions.canReadFromModule(module),
    canWrite: permissions.canWriteToModule(module),
    canView:
      permissions[
        `canView${(module.charAt(0).toUpperCase() + module.slice(1)) as "CRM" | "HR" | "Finance" | "Projects" | "Marketing" | "Settings"}`
      ],
    isLoading: permissions.isLoading,
    isError: permissions.isError,
  };
}
