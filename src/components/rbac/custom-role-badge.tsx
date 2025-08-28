"use client";

import type { UserRole } from "@prisma/client";
import { Badge } from "~/components/ui/badge";
import { ROLE_INFO } from "~/lib/rbac";
import type { RoleType } from "~/types/custom-roles";

interface CustomRoleBadgeProps {
  roleType: RoleType;
  className?: string;
}

export function CustomRoleBadge({ roleType, className }: CustomRoleBadgeProps) {
  // Get badge text and style
  const getBadgeContent = () => {
    if (roleType.type === "predefined" && roleType.role) {
      const roleInfo = ROLE_INFO[roleType.role];
      return {
        text: roleInfo?.name ?? roleType.role,
        className: roleInfo?.color ?? "bg-gray-100 text-gray-800",
      };
    }

    return {
      text: roleType.name,
      className: roleType.color,
    };
  };

  const { text, className: badgeClassName } = getBadgeContent();

  return (
    <Badge
      variant="secondary"
      className={`${badgeClassName} ${className ?? ""}`}
    >
      {text}
      {roleType.type === "custom" && (
        <span className="ml-1 text-xs opacity-75">(Custom)</span>
      )}
    </Badge>
  );
}

// Legacy component for backward compatibility
interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleInfo = ROLE_INFO[role];
  return (
    <Badge
      variant="secondary"
      className={`${roleInfo?.color ?? "bg-gray-100 text-gray-800"} ${className ?? ""}`}
    >
      {roleInfo?.name ?? role}
    </Badge>
  );
}
