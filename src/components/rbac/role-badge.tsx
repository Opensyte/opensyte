import type { UserRole } from "@prisma/client";
import { Badge } from "~/components/ui/badge";
import { ROLE_INFO } from "~/lib/rbac";

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const roleInfo = ROLE_INFO[role];

  if (!roleInfo) {
    return (
      <Badge variant="secondary" className={className}>
        Unknown Role
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={`${roleInfo.color} ${className}`}>
      {roleInfo.name}
    </Badge>
  );
}
