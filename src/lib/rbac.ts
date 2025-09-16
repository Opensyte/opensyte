import type { UserRole } from "@prisma/client";

// Define all available permissions
export const PERMISSIONS = {
  // CRM permissions
  CRM_READ: "crm:read",
  CRM_WRITE: "crm:write",
  CRM_ADMIN: "crm:admin",

  // Finance permissions
  FINANCE_READ: "finance:read",
  FINANCE_WRITE: "finance:write",
  FINANCE_ADMIN: "finance:admin",

  // HR permissions
  HR_READ: "hr:read",
  HR_WRITE: "hr:write",
  HR_ADMIN: "hr:admin",

  // Project permissions
  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  PROJECTS_ADMIN: "projects:admin",

  // Collaboration permissions
  COLLABORATION_READ: "collaboration:read",
  COLLABORATION_WRITE: "collaboration:write",

  // Marketing permissions
  MARKETING_READ: "marketing:read",
  MARKETING_WRITE: "marketing:write",
  MARKETING_ADMIN: "marketing:admin",

  // Settings permissions
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write",
  SETTINGS_ADMIN: "settings:admin",

  // Workflow permissions
  WORKFLOWS_READ: "workflows:read",
  WORKFLOWS_WRITE: "workflows:write",
  WORKFLOWS_ADMIN: "workflows:admin",

  // Template permissions
  TEMPLATES_READ: "templates:read",
  TEMPLATES_WRITE: "templates:write",
  TEMPLATES_ADMIN: "templates:admin",
  TEMPLATES_PUBLISH: "templates:publish",

  // Organization permissions
  ORG_ADMIN: "organization:admin",
  ORG_BILLING: "organization:billing",
  ORG_MEMBERS: "organization:members",

  // Billing permissions (Owner-only)
  BILLING_READ: "billing:read",
  BILLING_MANAGE: "billing:manage",
  BILLING_ADMIN: "billing:admin",
} as const;

/**
 * Get all permission names that should exist in the database
 */
export function getAllRequiredPermissionNames(): string[] {
  return Object.values(PERMISSIONS);
}

/**
 * Parse a permission string into its module and action parts.
 *
 * Accepts strings of the form `"module:action"` (e.g., `"crm:read"`, `"billing:admin"`).
 *
 * @param permission - Permission string to parse.
 * @returns An object with `module` and `action` (empty strings if either part is missing).
 */
export function parsePermission(permission: string) {
  const [module, action] = permission.split(":");
  return { module: module ?? "", action: action ?? "" };
}

/**
 * Build human-readable metadata for a permission string.
 *
 * Parses a permission name (typically in the form `"module:action"`) and returns
 * an object containing the original name, the parsed `module` and `action`, and
 * a generated `description` suitable for UI or database metadata.
 *
 * The description follows these rules:
 * - `read` → "View <module> data and information"
 * - `write` or `manage` → "Create and manage <module> data"
 * - `admin` → "Full <module> administration"
 * - unknown actions use a fallback of "`<Action> <module>`"
 *
 * Unknown module tokens are used verbatim (not humanized) and all module names
 * in descriptions are lowercased for consistency.
 *
 * @param permissionName - Permission identifier, e.g. `"crm:read"` or `"billing:admin"`.
 * @returns An object: `{ name: string; description: string; module: string; action: string }`.
 */
export function getPermissionMetadata(permissionName: string) {
  const { module, action } = parsePermission(permissionName);

  // Generate a readable description based on module and action
  const getDescription = (module: string, action: string) => {
    const moduleNames: Record<string, string> = {
      crm: "CRM",
      finance: "Finance",
      hr: "HR",
      projects: "Projects",
      collaboration: "Collaboration",
      marketing: "Marketing",
      workflows: "Workflows",
      templates: "Templates",
      settings: "Settings",
      organization: "Organization",
      billing: "Billing",
      ai: "AI",
    };

    const actionNames: Record<string, string> = {
      read: "View",
      write: "Manage",
      admin: "Administer",
      manage: "Manage",
      billing: "Billing",
      members: "Members",
    };

    const moduleName = moduleNames[module] ?? module;
    const actionName = actionNames[action] ?? action;

    if (action === "read") {
      return `View ${moduleName.toLowerCase()} data and information`;
    } else if (action === "write" || action === "manage") {
      return `Create and manage ${moduleName.toLowerCase()} data`;
    } else if (action === "admin") {
      return `Full ${moduleName.toLowerCase()} administration`;
    } else {
      return `${actionName} ${moduleName.toLowerCase()}`;
    }
  };

  return {
    name: permissionName,
    description: getDescription(module, action),
    module,
    action,
  };
}

// Define role hierarchies and permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Organization Level Roles
  ORGANIZATION_OWNER: [
    PERMISSIONS.CRM_ADMIN,
    PERMISSIONS.FINANCE_ADMIN,
    PERMISSIONS.HR_ADMIN,
    PERMISSIONS.PROJECTS_ADMIN,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_ADMIN,
    PERMISSIONS.WORKFLOWS_ADMIN,
    PERMISSIONS.TEMPLATES_ADMIN,
    PERMISSIONS.TEMPLATES_PUBLISH,
    PERMISSIONS.SETTINGS_ADMIN,
    PERMISSIONS.ORG_ADMIN,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.ORG_MEMBERS,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.BILLING_ADMIN,
  ],

  SUPER_ADMIN: [
    PERMISSIONS.CRM_ADMIN,
    PERMISSIONS.FINANCE_ADMIN,
    PERMISSIONS.HR_ADMIN,
    PERMISSIONS.PROJECTS_ADMIN,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_ADMIN,
    PERMISSIONS.WORKFLOWS_ADMIN,
    PERMISSIONS.TEMPLATES_ADMIN,
    PERMISSIONS.TEMPLATES_PUBLISH,
    PERMISSIONS.SETTINGS_ADMIN,
    PERMISSIONS.ORG_MEMBERS,
  ],

  DEPARTMENT_MANAGER: [
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.WORKFLOWS_WRITE,
    PERMISSIONS.TEMPLATES_WRITE,
    PERMISSIONS.SETTINGS_READ,
  ],

  // Departmental Roles
  HR_MANAGER: [
    PERMISSIONS.HR_ADMIN,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.FINANCE_READ, // Read access to payroll
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  SALES_MANAGER: [
    PERMISSIONS.CRM_ADMIN,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  FINANCE_MANAGER: [
    PERMISSIONS.FINANCE_ADMIN,
    PERMISSIONS.HR_READ, // Read access for payroll
    PERMISSIONS.CRM_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  PROJECT_MANAGER: [
    PERMISSIONS.PROJECTS_ADMIN,
    PERMISSIONS.CRM_READ, // Limited CRM access
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  // Standard User Roles
  EMPLOYEE: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.HR_READ, // Own HR data only
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  CONTRACTOR: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_READ,
    PERMISSIONS.TEMPLATES_READ,
    // Time-based restrictions should be implemented at application level
  ],

  VIEWER: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.WORKFLOWS_READ,
    PERMISSIONS.TEMPLATES_READ,
  ],
};

// Role display information
export const ROLE_INFO: Record<
  UserRole,
  {
    name: string;
    description: string;
    category: "Organization" | "Departmental" | "Standard" | "Legacy";
    color: string;
  }
> = {
  // Organization Level Roles
  ORGANIZATION_OWNER: {
    name: "Organization Owner",
    description: "Full platform access and billing control",
    category: "Organization",
    color: "bg-red-100 text-red-800",
  },
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Platform-wide administrative access except billing",
    category: "Organization",
    color: "bg-purple-100 text-purple-800",
  },
  DEPARTMENT_MANAGER: {
    name: "Department Manager",
    description: "Full access to assigned business modules",
    category: "Organization",
    color: "bg-blue-100 text-blue-800",
  },

  // Departmental Roles
  HR_MANAGER: {
    name: "HR Manager",
    description: "Full HR module access, read access to other modules",
    category: "Departmental",
    color: "bg-green-100 text-green-800",
  },
  SALES_MANAGER: {
    name: "Sales Manager",
    description: "Full CRM access, project viewing permissions",
    category: "Departmental",
    color: "bg-orange-100 text-orange-800",
  },
  FINANCE_MANAGER: {
    name: "Finance Manager",
    description: "Full finance module access, read access to HR payroll",
    category: "Departmental",
    color: "bg-yellow-100 text-yellow-800",
  },
  PROJECT_MANAGER: {
    name: "Project Manager",
    description: "Full project management access, limited CRM access",
    category: "Departmental",
    color: "bg-indigo-100 text-indigo-800",
  },

  // Standard User Roles
  EMPLOYEE: {
    name: "Employee",
    description: "Basic access to relevant modules based on job function",
    category: "Standard",
    color: "bg-gray-100 text-gray-800",
  },
  CONTRACTOR: {
    name: "Contractor",
    description: "Limited access with time-based restrictions",
    category: "Standard",
    color: "bg-pink-100 text-pink-800",
  },
  VIEWER: {
    name: "Viewer",
    description: "Read-only access to specific modules",
    category: "Standard",
    color: "bg-cyan-100 text-cyan-800",
  },
};

// Utility functions
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] ?? [];

  // Direct check first
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Handle hierarchical permissions (admin > write > read)
  const [module, action] = permission.split(":");
  if (!module || !action) {
    return rolePermissions.includes(permission); // Non-hierarchical permission
  }

  const adminPermission = `${module}:admin`;
  if (rolePermissions.includes(adminPermission)) {
    return true; // Admin has all permissions for this module
  }

  if (action === "read") {
    const writePermission = `${module}:write`;
    if (rolePermissions.includes(writePermission)) {
      return true; // Write permission grants read access
    }
  }

  return false;
}

export function hasAnyPermission(
  userRole: UserRole,
  permissions: string[]
): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(
  userRole: UserRole,
  permissions: string[]
): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function getUserPermissions(userRole: UserRole): string[] {
  return ROLE_PERMISSIONS[userRole] ?? [];
}

export function canAccessModule(userRole: UserRole, module: string): boolean {
  const permissions = getUserPermissions(userRole);
  return permissions.some(permission =>
    permission.startsWith(`${module.toLowerCase()}:`)
  );
}

// Navigation permissions helper
export function getNavPermissions(userRole: UserRole) {
  return {
    canViewCRM: canAccessModule(userRole, "crm"),
    canViewProjects: canAccessModule(userRole, "projects"),
    canViewFinance: canAccessModule(userRole, "finance"),
    canViewHR: canAccessModule(userRole, "hr"),
    canViewMarketing: canAccessModule(userRole, "marketing"),
    canViewCollaboration: canAccessModule(userRole, "collaboration"),
    canViewWorkflows: canAccessModule(userRole, "workflows"),
    canViewTemplates: canAccessModule(userRole, "templates"),
    canViewSettings: canAccessModule(userRole, "settings"),

    canWriteCRM:
      hasPermission(userRole, PERMISSIONS.CRM_WRITE) ||
      hasPermission(userRole, PERMISSIONS.CRM_ADMIN),
    canWriteProjects:
      hasPermission(userRole, PERMISSIONS.PROJECTS_WRITE) ||
      hasPermission(userRole, PERMISSIONS.PROJECTS_ADMIN),
    canWriteFinance:
      hasPermission(userRole, PERMISSIONS.FINANCE_WRITE) ||
      hasPermission(userRole, PERMISSIONS.FINANCE_ADMIN),
    canWriteHR:
      hasPermission(userRole, PERMISSIONS.HR_WRITE) ||
      hasPermission(userRole, PERMISSIONS.HR_ADMIN),
    canWriteMarketing:
      hasPermission(userRole, PERMISSIONS.MARKETING_WRITE) ||
      hasPermission(userRole, PERMISSIONS.MARKETING_ADMIN),
    canWriteCollaboration: hasPermission(
      userRole,
      PERMISSIONS.COLLABORATION_WRITE
    ),
    canWriteWorkflows:
      hasPermission(userRole, PERMISSIONS.WORKFLOWS_WRITE) ||
      hasPermission(userRole, PERMISSIONS.WORKFLOWS_ADMIN),
    canWriteTemplates:
      hasPermission(userRole, PERMISSIONS.TEMPLATES_WRITE) ||
      hasPermission(userRole, PERMISSIONS.TEMPLATES_ADMIN),
    canWriteSettings:
      hasPermission(userRole, PERMISSIONS.SETTINGS_WRITE) ||
      hasPermission(userRole, PERMISSIONS.SETTINGS_ADMIN),

    canManageOrganization: hasPermission(userRole, PERMISSIONS.ORG_ADMIN),
    canManageMembers: hasPermission(userRole, PERMISSIONS.ORG_MEMBERS),
    canManageBilling: hasPermission(userRole, PERMISSIONS.ORG_BILLING),
  };
}

// Helper to check if user can assign roles
export function canAssignRole(
  currentUserRole: UserRole,
  targetRole: UserRole
): boolean {
  // Get role hierarchy levels
  const getCurrentRoleLevel = (role: UserRole): number => {
    if (role === "ORGANIZATION_OWNER") return 5;
    if (role === "SUPER_ADMIN") return 4;
    if (role === "DEPARTMENT_MANAGER") return 3;
    if (
      [
        "HR_MANAGER",
        "SALES_MANAGER",
        "FINANCE_MANAGER",
        "PROJECT_MANAGER",
      ].includes(role)
    )
      return 2;
    return 1; // EMPLOYEE, CONTRACTOR, VIEWER
  };

  const currentLevel = getCurrentRoleLevel(currentUserRole);
  const targetLevel = getCurrentRoleLevel(targetRole);

  // Only organization-level roles can assign roles
  if (currentLevel < 3) {
    return false;
  }

  // Organization owners can assign any role except to other owners
  if (currentUserRole === "ORGANIZATION_OWNER") {
    return targetRole !== "ORGANIZATION_OWNER";
  }

  // Super admins cannot assign organization owner roles or equal/higher roles
  if (currentUserRole === "SUPER_ADMIN") {
    return targetLevel < 4;
  }

  // Department managers can only assign departmental and standard roles
  if (currentUserRole === "DEPARTMENT_MANAGER") {
    return targetLevel <= 2;
  }

  return false;
}

// Helper to get assignable roles for a user
export function getAssignableRoles(currentUserRole: UserRole): UserRole[] {
  const allRoles = Object.keys(ROLE_INFO) as UserRole[];
  return allRoles.filter(role => canAssignRole(currentUserRole, role));
}

// Helper to get role display name
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_INFO[role]?.name ?? role;
}

// Helper to check if user can manage roles at all
export function canManageRoles(userRole: UserRole): boolean {
  return (
    hasAnyPermission(userRole, [
      PERMISSIONS.ORG_ADMIN,
      PERMISSIONS.ORG_MEMBERS,
    ]) || ["DEPARTMENT_MANAGER"].includes(userRole)
  );
}

// Permission checking middleware helper for tRPC
export function requirePermission(
  userRole: UserRole | undefined,
  permission: string
): void {
  if (!userRole) {
    throw new Error("User role is required");
  }

  if (!hasPermission(userRole, permission)) {
    throw new Error(`Access denied. Required permission: ${permission}`);
  }
}

// Multiple permission checking helper for tRPC
export function requireAnyPermission(
  userRole: UserRole | undefined,
  permissions: string[]
): void {
  if (!userRole) {
    throw new Error("User role is required");
  }

  if (!hasAnyPermission(userRole, permissions)) {
    throw new Error(
      `Access denied. Required permissions: ${permissions.join(" OR ")}`
    );
  }
}

// Check if user can write to a specific module
export function canWriteToModule(
  userRole: UserRole,
  module:
    | "crm"
    | "hr"
    | "finance"
    | "projects"
    | "marketing"
    | "workflows"
    | "templates"
    | "settings"
): boolean {
  const writePermission = `${module}:write`;
  const adminPermission = `${module}:admin`;
  return hasAnyPermission(userRole, [writePermission, adminPermission]);
}

/**
 * Returns true if the role grants read access to the given module.
 *
 * This treats write and admin permissions as implicitly granting read access for the module.
 *
 * @param userRole - Role to check permissions for
 * @param module - Module name to check (e.g., "crm", "hr", "finance")
 * @returns True when the role has read, write, or admin permission for the module
 */
export function canReadFromModule(
  userRole: UserRole,
  module:
    | "crm"
    | "hr"
    | "finance"
    | "projects"
    | "marketing"
    | "workflows"
    | "templates"
    | "settings"
): boolean {
  const readPermission = `${module}:read`;
  const writePermission = `${module}:write`;
  const adminPermission = `${module}:admin`;
  return hasAnyPermission(userRole, [
    readPermission,
    writePermission,
    adminPermission,
  ]);
}

// Permission hierarchy levels
export const PERMISSION_HIERARCHY: Record<string, number> = {
  read: 1,
  write: 2,
  admin: 3,
  manage: 2,
  billing: 4, // Billing requires special owner permissions
  members: 2,
};

// Role hierarchy levels for custom role creation authorization
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  CONTRACTOR: 1,
  EMPLOYEE: 2,
  PROJECT_MANAGER: 3,
  SALES_MANAGER: 3,
  HR_MANAGER: 3,
  FINANCE_MANAGER: 3,
  DEPARTMENT_MANAGER: 4,
  SUPER_ADMIN: 5,
  ORGANIZATION_OWNER: 6,
};

/**
 * Returns the numeric hierarchy level for a given user role.
 *
 * Looks up the role in ROLE_HIERARCHY and returns its level. If the role is not present in the hierarchy map, returns 1 (base level).
 *
 * @param userRole - The role to evaluate
 * @returns The numeric hierarchy level for `userRole` (default 1 if unknown)
 */
export function getUserRoleLevel(userRole: UserRole): number {
  return ROLE_HIERARCHY[userRole] ?? 1;
}

/**
 * Determines whether a role is allowed to create custom roles.
 *
 * Returns true for roles with level 5 or higher (Super Admin and Organization Owner).
 *
 * @param userRole - Role to evaluate
 * @returns True if the role can create custom roles
 */
export function canCreateCustomRoles(userRole: UserRole): boolean {
  return getUserRoleLevel(userRole) >= 5; // Super Admin or Owner
}

/**
 * Returns the list of permissions that a given role is allowed to grant to others.
 *
 * Behavior summary:
 * - ORGANIZATION_OWNER: can grant all permissions they possess (including billing).
 * - SUPER_ADMIN: can grant their permissions except billing-related ones.
 * - Other roles: can grant permissions they possess, excluding billing and (unless sufficiently high-level) admin-level permissions.
 *
 * @param userRole - Role used to determine grantable permissions.
 * @returns An array of permission strings the role is permitted to grant.
 */
export function getGrantablePermissions(userRole: UserRole): string[] {
  const userPermissions = getUserPermissions(userRole);
  const userLevel = getUserRoleLevel(userRole);

  // Owner can grant all permissions except billing (billing is owner-only)
  if (userRole === "ORGANIZATION_OWNER") {
    return userPermissions; // Owner can grant all their permissions including billing
  }

  // Super Admin can grant permissions they have, but not billing permissions
  if (userRole === "SUPER_ADMIN") {
    return userPermissions.filter(
      permission =>
        !permission.startsWith("billing:") &&
        permission !== PERMISSIONS.ORG_BILLING
    );
  }

  // Other roles can only grant permissions they have, excluding admin-level and billing
  return userPermissions.filter(permission => {
    const [module, action] = permission.split(":");
    if (!module || !action) return false;

    // Never allow granting billing permissions unless owner
    if (module === "billing" || permission === PERMISSIONS.ORG_BILLING) {
      return false;
    }

    // Can't grant admin permissions unless user has admin or is high-level role
    if (action === "admin" && userLevel < 4) {
      return false;
    }

    return true;
  });
}

/**
 * Returns whether a user with the given role is allowed to grant the specified permission.
 *
 * The `permission` string must be in the format "module:action" (for example, "crm:read").
 * Granting is allowed when:
 * - The permission is directly grantable to the role (as returned by getGrantablePermissions), or
 * - The role has module-level admin privileges and a sufficiently high role level (non-admin target actions only, requires role level >= 4), or
 * - The role has module-level write and the requested permission is the module-level read action.
 *
 * @param userRole - The role of the user attempting to grant the permission.
 * @param permission - Permission name in "module:action" form to check for grantability.
 * @returns True if the userRole may grant the permission, otherwise false.
 */
export function canGrantPermission(
  userRole: UserRole,
  permission: string
): boolean {
  const grantablePermissions = getGrantablePermissions(userRole);

  // Direct permission check
  if (grantablePermissions.includes(permission)) {
    return true;
  }

  // Check hierarchical permissions
  const [module, action] = permission.split(":");
  if (!module || !action) return false;

  const userPermissions = getUserPermissions(userRole);
  const userLevel = getUserRoleLevel(userRole);

  // Check if user has higher level permission for the same module
  const adminPermission = `${module}:admin`;
  if (
    action !== "admin" &&
    userPermissions.includes(adminPermission) &&
    userLevel >= 4
  ) {
    return true;
  }

  const writePermission = `${module}:write`;
  if (action === "read" && userPermissions.includes(writePermission)) {
    return true;
  }

  return false;
}

/**
 * Validate a list of permissions for a custom role against what a user (by role) is allowed to grant.
 *
 * Performs per-permission checks and returns whether the requested set is acceptable, a list of
 * human-readable error messages for any disallowed items, and the specific permissions that are
 * not grantable by the given user role.
 *
 * The validation enforces:
 * - Billing permissions are only grantable by Organization Owners.
 * - Admin-level permissions require the grantee to have admin access for the module.
 * - A user can only grant permissions they are entitled to grant.
 * - A custom role must include at least one `:read` permission when any permissions are requested.
 *
 * @param userRole - Role of the user attempting to create/assign the custom role (the grantor).
 * @param requestedPermissions - Permission strings to validate (e.g., `"crm:read"`, `"projects:admin"`).
 * @returns An object with:
 *   - `valid`: true if no validation errors were produced.
 *   - `errors`: array of human-readable error messages explaining why specific permissions are disallowed.
 *   - `ungrantablePermissions`: array of permission strings from `requestedPermissions` that the userRole cannot grant.
 */
export function validateCustomRolePermissions(
  userRole: UserRole,
  requestedPermissions: string[]
): { valid: boolean; errors: string[]; ungrantablePermissions: string[] } {
  const errors: string[] = [];
  const ungrantablePermissions: string[] = [];

  for (const permission of requestedPermissions) {
    if (!canGrantPermission(userRole, permission)) {
      ungrantablePermissions.push(permission);

      // Provide specific error messages
      const [module, action] = permission.split(":");
      if (module === "billing" || permission === PERMISSIONS.ORG_BILLING) {
        errors.push(
          `You cannot grant billing permissions (${permission}) - only Organization Owners can manage billing`
        );
      } else if (action === "admin") {
        errors.push(
          `You cannot grant admin permissions (${permission}) because you don't have admin access to ${module}`
        );
      } else {
        errors.push(
          `You cannot grant permission (${permission}) because you don't have this permission yourself`
        );
      }
    }
  }

  // Must include at least one read permission
  const hasReadPermission = requestedPermissions.some(permission =>
    permission.endsWith(":read")
  );
  if (!hasReadPermission && requestedPermissions.length > 0) {
    errors.push("Custom role must include at least one read permission");
  }

  return {
    valid: errors.length === 0,
    errors,
    ungrantablePermissions,
  };
}
