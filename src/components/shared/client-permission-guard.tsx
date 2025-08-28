"use client";

import { type UserRole } from "@prisma/client";
import {
  hasPermission,
  hasAnyPermission,
  canReadFromModule,
  PERMISSIONS,
} from "~/lib/rbac";
import { AlertTriangle, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "~/components/ui/card";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";

interface ClientPermissionGuardProps {
  requiredPermissions?: string[];
  requiredAnyPermissions?: string[];
  requiredModule?:
    | "crm"
    | "hr"
    | "finance"
    | "projects"
    | "marketing"
    | "settings";
  fallback?: React.ReactNode;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function ClientPermissionGuard({
  requiredPermissions = [],
  requiredAnyPermissions = [],
  requiredModule,
  fallback,
  children,
  loadingComponent,
}: ClientPermissionGuardProps) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const params = useParams();
  const orgId = params?.orgId as string;

  const { data: userPermissions, isLoading: permissionsLoading } =
    api.rbac.getUserPermissions.useQuery(
      {
        userId: session?.user?.id ?? "",
        organizationId: orgId,
      },
      {
        enabled: !!session?.user?.id && !!orgId,
        retry: false,
      }
    );

  const isLoading = sessionLoading || permissionsLoading;

  // Show loading state - fixed the logic to use OR instead of nullish coalescing
  if (isLoading) {
    return loadingComponent ?? <DefaultLoadingComponent />;
  }

  // If no session, deny access
  if (!session?.user?.id) {
    return (
      <ClientPermissionDenied
        organizationId={orgId}
        reason="not-authenticated"
        fallback={fallback}
      />
    );
  }

  // If we have session but still loading permissions, show loading
  if (session?.user?.id && orgId && permissionsLoading) {
    return loadingComponent ?? <DefaultLoadingComponent />;
  }

  // If no user permissions data, user is not in organization
  if (!userPermissions) {
    return (
      <ClientPermissionDenied
        organizationId={orgId}
        reason="not-member"
        fallback={fallback}
      />
    );
  }

  const userRole = userPermissions.role;

  // Check required permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(
      permission => userRole && hasPermission(userRole, permission)
    );

    if (!hasAllPermissions) {
      return (
        <ClientPermissionDenied
          organizationId={orgId}
          reason="insufficient-permissions"
          requiredPermissions={requiredPermissions}
          userRole={userRole ?? undefined}
          fallback={fallback}
        />
      );
    }
  }

  // Check required any permissions (user needs at least one)
  if (requiredAnyPermissions.length > 0) {
    // For CRM permissions, check the computed permissions that handle both predefined and custom roles
    const hasCRMAccess = requiredAnyPermissions.some(permission => {
      switch (permission) {
        case PERMISSIONS.CRM_READ:
        case PERMISSIONS.CRM_WRITE:
        case PERMISSIONS.CRM_ADMIN:
          return userPermissions.permissions.canViewCRM;
        case PERMISSIONS.HR_READ:
        case PERMISSIONS.HR_WRITE:
        case PERMISSIONS.HR_ADMIN:
          return userPermissions.permissions.canViewHR;
        case PERMISSIONS.FINANCE_READ:
        case PERMISSIONS.FINANCE_WRITE:
        case PERMISSIONS.FINANCE_ADMIN:
          return userPermissions.permissions.canViewFinance;
        case PERMISSIONS.PROJECTS_READ:
        case PERMISSIONS.PROJECTS_WRITE:
        case PERMISSIONS.PROJECTS_ADMIN:
          return userPermissions.permissions.canViewProjects;
        case PERMISSIONS.MARKETING_READ:
        case PERMISSIONS.MARKETING_WRITE:
        case PERMISSIONS.MARKETING_ADMIN:
          return userPermissions.permissions.canViewMarketing;
        case PERMISSIONS.SETTINGS_READ:
        case PERMISSIONS.SETTINGS_WRITE:
        case PERMISSIONS.SETTINGS_ADMIN:
          return userPermissions.permissions.canViewSettings;
        case PERMISSIONS.ORG_ADMIN:
          return userPermissions.permissions.canManageOrganization;
        case PERMISSIONS.ORG_MEMBERS:
          return userPermissions.permissions.canManageMembers;
        case PERMISSIONS.ORG_BILLING:
          return userPermissions.permissions.canManageBilling;
        default:
          // Fallback to old method for predefined roles only
          return userRole ? hasAnyPermission(userRole, [permission]) : false;
      }
    });

    if (!hasCRMAccess) {
      return (
        <ClientPermissionDenied
          organizationId={orgId}
          reason="insufficient-permissions"
          requiredPermissions={requiredAnyPermissions}
          userRole={userRole ?? undefined}
          fallback={fallback}
        />
      );
    }
  }

  // Check module access
  if (requiredModule) {
    let hasModuleAccess = false;

    switch (requiredModule) {
      case "crm":
        hasModuleAccess = userPermissions.permissions.canViewCRM;
        break;
      case "hr":
        hasModuleAccess = userPermissions.permissions.canViewHR;
        break;
      case "finance":
        hasModuleAccess = userPermissions.permissions.canViewFinance;
        break;
      case "projects":
        hasModuleAccess = userPermissions.permissions.canViewProjects;
        break;
      case "marketing":
        hasModuleAccess = userPermissions.permissions.canViewMarketing;
        break;
      case "settings":
        hasModuleAccess = userPermissions.permissions.canViewSettings;
        break;
      default:
        // Fallback to old method for predefined roles
        hasModuleAccess = userRole
          ? canReadFromModule(userRole, requiredModule)
          : false;
    }

    if (!hasModuleAccess) {
      return (
        <ClientPermissionDenied
          organizationId={orgId}
          reason="module-access-denied"
          module={requiredModule}
          userRole={userRole ?? undefined}
          fallback={fallback}
        />
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

interface ClientPermissionDeniedProps {
  organizationId: string;
  reason:
    | "not-authenticated"
    | "not-member"
    | "insufficient-permissions"
    | "module-access-denied";
  requiredPermissions?: string[];
  module?: string;
  userRole?: UserRole;
  fallback?: React.ReactNode;
}

function ClientPermissionDenied({
  organizationId: _organizationId,
  reason,
  requiredPermissions: _requiredPermissions = [],
  module,
  userRole: _userRole,
  fallback,
}: ClientPermissionDeniedProps) {
  if (fallback) {
    return <>{fallback}</>;
  }

  const getReasonMessage = () => {
    switch (reason) {
      case "not-authenticated":
        return {
          title: "Authentication Required",
          description: "You need to be logged in to access this page.",
          icon: Lock,
          iconColor: "text-blue-500",
          iconBg: "bg-blue-50 dark:bg-blue-950/20",
        };
      case "not-member":
        return {
          title: "Access Denied",
          description:
            "You are not a member of this organization or your session has expired.",
          icon: AlertTriangle,
          iconColor: "text-amber-500",
          iconBg: "bg-amber-50 dark:bg-amber-950/20",
        };
      case "insufficient-permissions":
        return {
          title: "Insufficient Permissions",
          description:
            "You don't have the required permissions to access this page.",
          icon: Lock,
          iconColor: "text-red-500",
          iconBg: "bg-red-50 dark:bg-red-950/20",
        };
      case "module-access-denied":
        return {
          title: "Module Access Denied",
          description: `You don't have access to the ${module?.charAt(0)?.toUpperCase()}${module?.slice(1)} module.`,
          icon: Lock,
          iconColor: "text-red-500",
          iconBg: "bg-red-50 dark:bg-red-950/20",
        };
      default:
        return {
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          icon: Lock,
          iconColor: "text-red-500",
          iconBg: "bg-red-50 dark:bg-red-950/20",
        };
    }
  };

  const {
    title,
    description,
    icon: Icon,
    iconColor,
    iconBg,
  } = getReasonMessage();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-12 pb-8">
          <div
            className={`mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>

          <CardTitle className="mb-3 text-lg font-semibold">{title}</CardTitle>

          <CardDescription className="mb-8 text-sm leading-relaxed">
            {description}
          </CardDescription>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-2">
            {reason === "not-authenticated" ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DefaultLoadingComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>

          <CardTitle className="mb-3 text-lg font-semibold">
            Checking Access
          </CardTitle>

          <CardDescription className="text-sm">
            Verifying your permissions...
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions for common permission patterns
export function withClientCRMPermissions(
  children: React.ReactNode,
  props?: Partial<ClientPermissionGuardProps>
) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.CRM_READ,
        PERMISSIONS.CRM_WRITE,
        PERMISSIONS.CRM_ADMIN,
      ]}
      {...props}
    >
      {children}
    </ClientPermissionGuard>
  );
}

export function withClientHRPermissions(
  children: React.ReactNode,
  props?: Partial<ClientPermissionGuardProps>
) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.HR_READ,
        PERMISSIONS.HR_WRITE,
        PERMISSIONS.HR_ADMIN,
      ]}
      {...props}
    >
      {children}
    </ClientPermissionGuard>
  );
}

export function withClientFinancePermissions(
  children: React.ReactNode,
  props?: Partial<ClientPermissionGuardProps>
) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.FINANCE_WRITE,
        PERMISSIONS.FINANCE_ADMIN,
      ]}
      {...props}
    >
      {children}
    </ClientPermissionGuard>
  );
}

export function withClientProjectPermissions(
  children: React.ReactNode,
  props?: Partial<ClientPermissionGuardProps>
) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.PROJECTS_READ,
        PERMISSIONS.PROJECTS_WRITE,
        PERMISSIONS.PROJECTS_ADMIN,
      ]}
      {...props}
    >
      {children}
    </ClientPermissionGuard>
  );
}

export function withClientSettingsPermissions(
  children: React.ReactNode,
  props?: Partial<ClientPermissionGuardProps>
) {
  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_WRITE,
        PERMISSIONS.SETTINGS_ADMIN,
      ]}
      {...props}
    >
      {children}
    </ClientPermissionGuard>
  );
}
