import type { UserRole } from "@prisma/client";

// Temporary type definitions while Prisma client regenerates
export type Permission = {
  id: string;
  name: string;
  description: string | null;
  module: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomRole = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomRolePermission = {
  id: string;
  customRoleId: string;
  permissionId: string;
  createdAt: Date;
};

export type CustomRoleWithPermissions = CustomRole & {
  permissions: {
    permission: Permission;
  }[];
};

export type PermissionModule =
  | "crm"
  | "finance"
  | "hr"
  | "projects"
  | "collaboration"
  | "marketing"
  | "settings"
  | "organization";

export type PermissionAction =
  | "read"
  | "write"
  | "admin"
  | "delete"
  | "billing"
  | "members";

export interface PermissionGroup {
  module: PermissionModule;
  label: string;
  description: string;
  permissions: Permission[];
}

export interface RoleType {
  type: "predefined" | "custom";
  role?: UserRole;
  customRoleId?: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  category?: string;
}

export interface CreateCustomRoleInput {
  name: string;
  description?: string;
  color?: string;
  permissionIds: string[];
}

export interface UpdateCustomRoleInput extends CreateCustomRoleInput {
  id: string;
}

export type UserRoleAssignment =
  | {
      type: "predefined";
      role: UserRole;
    }
  | {
      type: "custom";
      customRoleId: string;
    };

export type ExtendedUserOrganization = {
  userId: string;
  organizationId: string;
  role: UserRole | null;
  customRoleId: string | null;
  joinedAt: Date;
  customRole?: CustomRoleWithPermissions | null;
};
