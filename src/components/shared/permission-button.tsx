"use client";

import React from "react";
import { usePermissions } from "~/hooks/use-permissions";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface PermissionButtonProps {
  userId: string;
  organizationId: string;
  requiredPermission: "read" | "write" | "admin";
  module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings";
  children: React.ReactNode;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  fallbackText?: string;
}

/**
 * A button component that automatically handles permission checks and displays
 * appropriate states based on user permissions.
 */
export function PermissionButton({
  userId,
  organizationId,
  requiredPermission,
  module,
  children,
  variant = "default",
  size = "default",
  className,
  onClick,
  disabled = false,
  fallbackText = "Access Denied",
  ...props
}: PermissionButtonProps) {
  const permissions = usePermissions({ userId, organizationId });

  // Show loading skeleton while permissions are being fetched
  if (permissions.isLoading) {
    return <Skeleton className={cn("h-10 w-24", className)} />;
  }

  // Show error state if permissions couldn't be loaded
  if (permissions.isError) {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn("opacity-50", className)}
        disabled={true}
        {...props}
      >
        <AlertCircle className="mr-2 h-4 w-4" />
        Error
      </Button>
    );
  }

  // Check permissions based on module and required level
  const hasPermission = (() => {
    switch (requiredPermission) {
      case "read":
        return permissions.canReadFromModule(module);
      case "write":
        return permissions.canWriteToModule(module);
      case "admin":
        switch (module) {
          case "crm":
            return permissions.canAdminCRM;
          case "hr":
            return permissions.canAdminHR;
          case "finance":
            return permissions.canAdminFinance;
          case "projects":
            return permissions.canAdminProjects;
          case "marketing":
            return permissions.canAdminMarketing;
          case "settings":
            return permissions.canAdminSettings;
          default:
            return false;
        }
      default:
        return false;
    }
  })();

  // Show access denied button if user lacks permission
  if (!hasPermission) {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn("opacity-50 cursor-not-allowed", className)}
        disabled={true}
        {...props}
      >
        {fallbackText}
      </Button>
    );
  }

  // Render the button normally if user has permission
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * HOC for wrapping components with permission checks
 */
interface WithPermissionsProps {
  userId: string;
  organizationId: string;
  requiredPermission: "read" | "write" | "admin";
  module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings";
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function WithPermissions({
  userId,
  organizationId,
  requiredPermission,
  module,
  fallback = null,
  children,
}: WithPermissionsProps) {
  const permissions = usePermissions({ userId, organizationId });

  // Show loading state
  if (permissions.isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  // Show error state
  if (permissions.isError) {
    return (
      fallback ?? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Unable to verify permissions</span>
        </div>
      )
    );
  }

  // Check permissions
  const hasPermission = (() => {
    switch (requiredPermission) {
      case "read":
        return permissions.canReadFromModule(module);
      case "write":
        return permissions.canWriteToModule(module);
      case "admin":
        switch (module) {
          case "crm":
            return permissions.canAdminCRM;
          case "hr":
            return permissions.canAdminHR;
          case "finance":
            return permissions.canAdminFinance;
          case "projects":
            return permissions.canAdminProjects;
          case "marketing":
            return permissions.canAdminMarketing;
          case "settings":
            return permissions.canAdminSettings;
          default:
            return false;
        }
      default:
        return false;
    }
  })();

  if (!hasPermission) {
    return fallback;
  }

  return <>{children}</>;
}

/**
 * Simplified permission check hook for conditional rendering
 */
export function usePermissionCheck(
  userId: string,
  organizationId: string,
  requiredPermission: "read" | "write" | "admin",
  module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
) {
  const permissions = usePermissions({ userId, organizationId });

  const hasPermission = React.useMemo(() => {
    if (permissions.isLoading || permissions.isError) {
      return false;
    }

    switch (requiredPermission) {
      case "read":
        return permissions.canReadFromModule(module);
      case "write":
        return permissions.canWriteToModule(module);
      case "admin":
        switch (module) {
          case "crm":
            return permissions.canAdminCRM;
          case "hr":
            return permissions.canAdminHR;
          case "finance":
            return permissions.canAdminFinance;
          case "projects":
            return permissions.canAdminProjects;
          case "marketing":
            return permissions.canAdminMarketing;
          case "settings":
            return permissions.canAdminSettings;
          default:
            return false;
        }
      default:
        return false;
    }
  }, [permissions, requiredPermission, module]);

  return {
    hasPermission,
    isLoading: permissions.isLoading,
    isError: permissions.isError,
    permissions,
  };
}
