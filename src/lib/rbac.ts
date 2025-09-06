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

  // AI permissions
  AI_READ: "ai:read",
  AI_WRITE: "ai:write",
  AI_ADMIN: "ai:admin",

  // Organization permissions
  ORG_ADMIN: "organization:admin",
  ORG_BILLING: "organization:billing",
  ORG_MEMBERS: "organization:members",
} as const;

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
    PERMISSIONS.SETTINGS_ADMIN,
    PERMISSIONS.AI_ADMIN,
    PERMISSIONS.ORG_ADMIN,
    PERMISSIONS.ORG_BILLING,
    PERMISSIONS.ORG_MEMBERS,
  ],

  SUPER_ADMIN: [
    PERMISSIONS.CRM_ADMIN,
    PERMISSIONS.FINANCE_ADMIN,
    PERMISSIONS.HR_ADMIN,
    PERMISSIONS.PROJECTS_ADMIN,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_ADMIN,
    PERMISSIONS.SETTINGS_ADMIN,
    PERMISSIONS.AI_ADMIN,
    PERMISSIONS.ORG_MEMBERS,
  ],

  DEPARTMENT_MANAGER: [
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.PROJECTS_WRITE,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  // Departmental Roles
  HR_MANAGER: [
    PERMISSIONS.HR_ADMIN,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.FINANCE_READ, // Read access to payroll
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.AI_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  SALES_MANAGER: [
    PERMISSIONS.CRM_ADMIN,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.AI_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  FINANCE_MANAGER: [
    PERMISSIONS.FINANCE_ADMIN,
    PERMISSIONS.HR_READ, // Read access for payroll
    PERMISSIONS.CRM_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.AI_WRITE, // Finance gets AI write access for audit features
    PERMISSIONS.SETTINGS_READ,
  ],

  PROJECT_MANAGER: [
    PERMISSIONS.PROJECTS_ADMIN,
    PERMISSIONS.CRM_READ, // Limited CRM access
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.HR_READ,
    PERMISSIONS.AI_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  // Standard User Roles
  EMPLOYEE: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_WRITE,
    PERMISSIONS.HR_READ, // Own HR data only
    PERMISSIONS.AI_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  CONTRACTOR: [
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_READ,
    // Time-based restrictions should be implemented at application level
  ],

  VIEWER: [
    PERMISSIONS.CRM_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.COLLABORATION_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.HR_READ,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.AI_READ,
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
    canViewSettings: canAccessModule(userRole, "settings"),
    canViewAI: canAccessModule(userRole, "ai"),

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
    canWriteSettings:
      hasPermission(userRole, PERMISSIONS.SETTINGS_WRITE) ||
      hasPermission(userRole, PERMISSIONS.SETTINGS_ADMIN),
    canWriteAI:
      hasPermission(userRole, PERMISSIONS.AI_WRITE) ||
      hasPermission(userRole, PERMISSIONS.AI_ADMIN),

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
  module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
): boolean {
  const writePermission = `${module}:write`;
  const adminPermission = `${module}:admin`;
  return hasAnyPermission(userRole, [writePermission, adminPermission]);
}

// Check if user can read from a specific module
export function canReadFromModule(
  userRole: UserRole,
  module: "crm" | "hr" | "finance" | "projects" | "marketing" | "settings"
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
