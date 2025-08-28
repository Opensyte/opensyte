"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import { PERMISSIONS } from "~/lib/rbac";

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
    if (!userPermissions?.permissions) {
      return {
        role: null,
        customRole: null,
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

        // Collaboration permissions
        canViewCollaboration: false,
        canReadCollaboration: false,
        canWriteCollaboration: false,
        canAdminCollaboration: false,

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

    // Use the computed permissions from the query
    const computedPermissions = userPermissions.permissions;

    return {
      role: userPermissions.role,
      customRole: userPermissions.customRole,
      // CRM permissions - using canViewCRM as canReadCRM for backward compatibility
      canViewCRM: computedPermissions.canViewCRM,
      canReadCRM: computedPermissions.canViewCRM, // Read = View for custom roles
      canWriteCRM: computedPermissions.canWriteCRM,
      canAdminCRM: computedPermissions.canWriteCRM, // Admin included in write for custom roles

      // HR permissions
      canViewHR: computedPermissions.canViewHR,
      canReadHR: computedPermissions.canViewHR,
      canWriteHR: computedPermissions.canWriteHR,
      canAdminHR: computedPermissions.canWriteHR,

      // Finance permissions
      canViewFinance: computedPermissions.canViewFinance,
      canReadFinance: computedPermissions.canViewFinance,
      canWriteFinance: computedPermissions.canWriteFinance,
      canAdminFinance: computedPermissions.canWriteFinance,

      // Projects permissions
      canViewProjects: computedPermissions.canViewProjects,
      canReadProjects: computedPermissions.canViewProjects,
      canWriteProjects: computedPermissions.canWriteProjects,
      canAdminProjects: computedPermissions.canWriteProjects,

      // Marketing permissions
      canViewMarketing: computedPermissions.canViewMarketing,
      canReadMarketing: computedPermissions.canViewMarketing,
      canWriteMarketing: computedPermissions.canWriteMarketing,
      canAdminMarketing: computedPermissions.canWriteMarketing,

      // Collaboration permissions
      canViewCollaboration: computedPermissions.canViewCollaboration,
      canReadCollaboration: computedPermissions.canViewCollaboration,
      canWriteCollaboration: computedPermissions.canWriteCollaboration,
      canAdminCollaboration: computedPermissions.canWriteCollaboration,

      // Settings permissions
      canViewSettings: computedPermissions.canViewSettings,
      canReadSettings: computedPermissions.canViewSettings,
      canWriteSettings: computedPermissions.canWriteSettings,
      canAdminSettings: computedPermissions.canWriteSettings,

      // Organization permissions
      canManageOrganization: computedPermissions.canManageOrganization,
      canManageMembers: computedPermissions.canManageMembers,
      canManageBilling: computedPermissions.canManageBilling,

      // Helper functions - these will work for both predefined and custom roles
      hasPermission: (permission: string) => {
        // For backward compatibility, map common permission checks to computed permissions
        switch (permission) {
          case PERMISSIONS.CRM_READ:
          case PERMISSIONS.CRM_WRITE:
          case PERMISSIONS.CRM_ADMIN:
            return (
              computedPermissions.canViewCRM || computedPermissions.canWriteCRM
            );
          case PERMISSIONS.HR_READ:
          case PERMISSIONS.HR_WRITE:
          case PERMISSIONS.HR_ADMIN:
            return (
              computedPermissions.canViewHR || computedPermissions.canWriteHR
            );
          case PERMISSIONS.FINANCE_READ:
          case PERMISSIONS.FINANCE_WRITE:
          case PERMISSIONS.FINANCE_ADMIN:
            return (
              computedPermissions.canViewFinance ||
              computedPermissions.canWriteFinance
            );
          case PERMISSIONS.PROJECTS_READ:
          case PERMISSIONS.PROJECTS_WRITE:
          case PERMISSIONS.PROJECTS_ADMIN:
            return (
              computedPermissions.canViewProjects ||
              computedPermissions.canWriteProjects
            );
          case PERMISSIONS.MARKETING_READ:
          case PERMISSIONS.MARKETING_WRITE:
          case PERMISSIONS.MARKETING_ADMIN:
            return (
              computedPermissions.canViewMarketing ||
              computedPermissions.canWriteMarketing
            );
          case PERMISSIONS.SETTINGS_READ:
          case PERMISSIONS.SETTINGS_WRITE:
          case PERMISSIONS.SETTINGS_ADMIN:
            return (
              computedPermissions.canViewSettings ||
              computedPermissions.canWriteSettings
            );
          case PERMISSIONS.ORG_ADMIN:
            return computedPermissions.canManageOrganization;
          case PERMISSIONS.ORG_MEMBERS:
            return computedPermissions.canManageMembers;
          case PERMISSIONS.ORG_BILLING:
            return computedPermissions.canManageBilling;
          default:
            return false;
        }
      },
      hasAnyPermission: (permissions: string[]) => {
        return permissions.some(permission => {
          switch (permission) {
            case PERMISSIONS.CRM_READ:
            case PERMISSIONS.CRM_WRITE:
            case PERMISSIONS.CRM_ADMIN:
              return (
                computedPermissions.canViewCRM ||
                computedPermissions.canWriteCRM
              );
            case PERMISSIONS.HR_READ:
            case PERMISSIONS.HR_WRITE:
            case PERMISSIONS.HR_ADMIN:
              return (
                computedPermissions.canViewHR || computedPermissions.canWriteHR
              );
            case PERMISSIONS.FINANCE_READ:
            case PERMISSIONS.FINANCE_WRITE:
            case PERMISSIONS.FINANCE_ADMIN:
              return (
                computedPermissions.canViewFinance ||
                computedPermissions.canWriteFinance
              );
            case PERMISSIONS.PROJECTS_READ:
            case PERMISSIONS.PROJECTS_WRITE:
            case PERMISSIONS.PROJECTS_ADMIN:
              return (
                computedPermissions.canViewProjects ||
                computedPermissions.canWriteProjects
              );
            case PERMISSIONS.MARKETING_READ:
            case PERMISSIONS.MARKETING_WRITE:
            case PERMISSIONS.MARKETING_ADMIN:
              return (
                computedPermissions.canViewMarketing ||
                computedPermissions.canWriteMarketing
              );
            case PERMISSIONS.SETTINGS_READ:
            case PERMISSIONS.SETTINGS_WRITE:
            case PERMISSIONS.SETTINGS_ADMIN:
              return (
                computedPermissions.canViewSettings ||
                computedPermissions.canWriteSettings
              );
            case PERMISSIONS.ORG_ADMIN:
              return computedPermissions.canManageOrganization;
            case PERMISSIONS.ORG_MEMBERS:
              return computedPermissions.canManageMembers;
            case PERMISSIONS.ORG_BILLING:
              return computedPermissions.canManageBilling;
            default:
              return false;
          }
        });
      },
      canWriteToModule: (
        module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
      ) => {
        switch (module) {
          case "crm":
            return computedPermissions.canWriteCRM;
          case "hr":
            return computedPermissions.canWriteHR;
          case "finance":
            return computedPermissions.canWriteFinance;
          case "projects":
            return computedPermissions.canWriteProjects;
          case "marketing":
            return computedPermissions.canWriteMarketing;
          case "settings":
            return computedPermissions.canWriteSettings;
          default:
            return false;
        }
      },
      canReadFromModule: (
        module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
      ) => {
        switch (module) {
          case "crm":
            return computedPermissions.canViewCRM;
          case "hr":
            return computedPermissions.canViewHR;
          case "finance":
            return computedPermissions.canViewFinance;
          case "projects":
            return computedPermissions.canViewProjects;
          case "marketing":
            return computedPermissions.canViewMarketing;
          case "settings":
            return computedPermissions.canViewSettings;
          default:
            return false;
        }
      },
    };
  }, [
    userPermissions?.permissions,
    userPermissions?.role,
    userPermissions?.customRole,
  ]);

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
