import { type UserRole } from "@prisma/client";
import {
  hasPermission,
  hasAnyPermission,
  canReadFromModule,
  PERMISSIONS,
} from "~/lib/rbac";
import { AlertTriangle, Lock, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";

interface PermissionGuardProps {
  userRole: UserRole | null;
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
  organizationId: string;
  children: React.ReactNode;
}

export function PermissionGuard({
  userRole,
  requiredPermissions = [],
  requiredAnyPermissions = [],
  requiredModule,
  fallback,
  organizationId,
  children,
}: PermissionGuardProps) {
  // If no user role (not authenticated or not in organization), deny access
  if (!userRole) {
    return (
      <PermissionDenied
        organizationId={organizationId}
        reason="not-member"
        fallback={fallback}
      />
    );
  }

  // Check required permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission =>
      hasPermission(userRole, permission)
    );

    if (!hasAllPermissions) {
      return (
        <PermissionDenied
          organizationId={organizationId}
          reason="insufficient-permissions"
          requiredPermissions={requiredPermissions}
          userRole={userRole}
          fallback={fallback}
        />
      );
    }
  }

  // Check required any permissions (user needs at least one)
  if (requiredAnyPermissions.length > 0) {
    const hasAnyRequiredPermission = hasAnyPermission(
      userRole,
      requiredAnyPermissions
    );

    if (!hasAnyRequiredPermission) {
      return (
        <PermissionDenied
          organizationId={organizationId}
          reason="insufficient-permissions"
          requiredPermissions={requiredAnyPermissions}
          userRole={userRole}
          fallback={fallback}
        />
      );
    }
  }

  // Check module access
  if (requiredModule) {
    const hasModuleAccess = canReadFromModule(userRole, requiredModule);

    if (!hasModuleAccess) {
      return (
        <PermissionDenied
          organizationId={organizationId}
          reason="module-access-denied"
          module={requiredModule}
          userRole={userRole}
          fallback={fallback}
        />
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

interface PermissionDeniedProps {
  organizationId: string;
  reason: "not-member" | "insufficient-permissions" | "module-access-denied";
  requiredPermissions?: string[];
  module?: string;
  userRole?: UserRole;
  fallback?: React.ReactNode;
}

function PermissionDenied({
  organizationId,
  reason,
  requiredPermissions = [],
  module,
  userRole,
  fallback,
}: PermissionDeniedProps) {
  if (fallback) {
    return <>{fallback}</>;
  }

  const getReasonMessage = () => {
    switch (reason) {
      case "not-member":
        return {
          title: "Access Denied",
          description:
            "You are not a member of this organization or your session has expired.",
          details:
            "Please contact an organization administrator to request access.",
        };
      case "insufficient-permissions":
        return {
          title: "Insufficient Permissions",
          description:
            "You don't have the required permissions to access this page.",
          details:
            "Contact your organization administrator to request the necessary permissions.",
        };
      case "module-access-denied":
        return {
          title: "Module Access Denied",
          description: `You don't have access to the ${module?.toUpperCase()} module.`,
          details:
            "Contact your organization administrator to request access to this module.",
        };
      default:
        return {
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          details: "Contact your organization administrator for assistance.",
        };
    }
  };

  const { title, description, details } = getReasonMessage();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">{details}</p>

          {userRole && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Your current role:</p>
              <div className="flex justify-center">
                <Badge variant="outline" className="capitalize">
                  {userRole.toLowerCase().replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          )}

          {requiredPermissions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Required permissions:</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {requiredPermissions.map(permission => (
                  <Badge
                    key={permission}
                    variant="secondary"
                    className="text-xs"
                  >
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/${organizationId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to wrap pages with common permission patterns
export function withCRMPermissions(
  children: React.ReactNode,
  userRole: UserRole | null,
  organizationId: string
) {
  return (
    <PermissionGuard
      userRole={userRole}
      requiredAnyPermissions={[
        PERMISSIONS.CRM_READ,
        PERMISSIONS.CRM_WRITE,
        PERMISSIONS.CRM_ADMIN,
      ]}
      organizationId={organizationId}
    >
      {children}
    </PermissionGuard>
  );
}

export function withHRPermissions(
  children: React.ReactNode,
  userRole: UserRole | null,
  organizationId: string
) {
  return (
    <PermissionGuard
      userRole={userRole}
      requiredAnyPermissions={[
        PERMISSIONS.HR_READ,
        PERMISSIONS.HR_WRITE,
        PERMISSIONS.HR_ADMIN,
      ]}
      organizationId={organizationId}
    >
      {children}
    </PermissionGuard>
  );
}

export function withFinancePermissions(
  children: React.ReactNode,
  userRole: UserRole | null,
  organizationId: string
) {
  return (
    <PermissionGuard
      userRole={userRole}
      requiredAnyPermissions={[
        PERMISSIONS.FINANCE_READ,
        PERMISSIONS.FINANCE_WRITE,
        PERMISSIONS.FINANCE_ADMIN,
      ]}
      organizationId={organizationId}
    >
      {children}
    </PermissionGuard>
  );
}

export function withProjectPermissions(
  children: React.ReactNode,
  userRole: UserRole | null,
  organizationId: string
) {
  return (
    <PermissionGuard
      userRole={userRole}
      requiredAnyPermissions={[
        PERMISSIONS.PROJECTS_READ,
        PERMISSIONS.PROJECTS_WRITE,
        PERMISSIONS.PROJECTS_ADMIN,
      ]}
      organizationId={organizationId}
    >
      {children}
    </PermissionGuard>
  );
}

export function withSettingsPermissions(
  children: React.ReactNode,
  userRole: UserRole | null,
  organizationId: string
) {
  return (
    <PermissionGuard
      userRole={userRole}
      requiredAnyPermissions={[
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_WRITE,
        PERMISSIONS.SETTINGS_ADMIN,
      ]}
      organizationId={organizationId}
    >
      {children}
    </PermissionGuard>
  );
}
