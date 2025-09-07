import type { UserRole } from "@prisma/client";
import type {
  ExtendedUserOrganization,
  RoleType,
  PermissionGroup,
  UserRoleAssignment,
} from "~/types/custom-roles";
import {
  PERMISSIONS,
  ROLE_INFO,
  canAssignRole as canAssignPredefinedRole,
  getUserPermissions as getPredefinedUserPermissions,
  validateCustomRolePermissions as validateCustomRolePermissionsRBAC,
  getGrantablePermissions as getGrantablePermissionsRBAC,
} from "./rbac";

// Permission modules and their available permissions
export const PERMISSION_MODULES: PermissionGroup[] = [
  {
    module: "crm",
    label: "Customer Relationship Management",
    description: "Manage customer data, interactions, and sales pipeline",
    permissions: [
      {
        id: PERMISSIONS.CRM_READ,
        name: PERMISSIONS.CRM_READ,
        description: "View customer data",
        module: "crm",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.CRM_WRITE,
        name: PERMISSIONS.CRM_WRITE,
        description: "Create and edit customers",
        module: "crm",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.CRM_ADMIN,
        name: PERMISSIONS.CRM_ADMIN,
        description: "Full CRM administration",
        module: "crm",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "finance",
    label: "Financial Management",
    description: "Handle invoicing, payments, and financial reports",
    permissions: [
      {
        id: PERMISSIONS.FINANCE_READ,
        name: PERMISSIONS.FINANCE_READ,
        description: "View financial data",
        module: "finance",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.FINANCE_WRITE,
        name: PERMISSIONS.FINANCE_WRITE,
        description: "Create invoices and payments",
        module: "finance",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.FINANCE_ADMIN,
        name: PERMISSIONS.FINANCE_ADMIN,
        description: "Full financial administration",
        module: "finance",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "hr",
    label: "Human Resources",
    description: "Manage employees, payroll, and performance",
    permissions: [
      {
        id: PERMISSIONS.HR_READ,
        name: PERMISSIONS.HR_READ,
        description: "View employee data",
        module: "hr",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.HR_WRITE,
        name: PERMISSIONS.HR_WRITE,
        description: "Manage employee records",
        module: "hr",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.HR_ADMIN,
        name: PERMISSIONS.HR_ADMIN,
        description: "Full HR administration",
        module: "hr",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "projects",
    label: "Project Management",
    description: "Manage projects, tasks, and time tracking",
    permissions: [
      {
        id: PERMISSIONS.PROJECTS_READ,
        name: PERMISSIONS.PROJECTS_READ,
        description: "View projects and tasks",
        module: "projects",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.PROJECTS_WRITE,
        name: PERMISSIONS.PROJECTS_WRITE,
        description: "Create and manage projects",
        module: "projects",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.PROJECTS_ADMIN,
        name: PERMISSIONS.PROJECTS_ADMIN,
        description: "Full project administration",
        module: "projects",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "collaboration",
    label: "Team Collaboration",
    description: "Communication, calendar, and file sharing",
    permissions: [
      {
        id: PERMISSIONS.COLLABORATION_READ,
        name: PERMISSIONS.COLLABORATION_READ,
        description: "View team content",
        module: "collaboration",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.COLLABORATION_WRITE,
        name: PERMISSIONS.COLLABORATION_WRITE,
        description: "Create and share content",
        module: "collaboration",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "marketing",
    label: "Marketing Automation",
    description: "Campaigns, email marketing, and analytics",
    permissions: [
      {
        id: PERMISSIONS.MARKETING_READ,
        name: PERMISSIONS.MARKETING_READ,
        description: "View marketing data",
        module: "marketing",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.MARKETING_WRITE,
        name: PERMISSIONS.MARKETING_WRITE,
        description: "Create campaigns",
        module: "marketing",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.MARKETING_ADMIN,
        name: PERMISSIONS.MARKETING_ADMIN,
        description: "Full marketing administration",
        module: "marketing",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "settings",
    label: "System Settings",
    description: "Organization settings and configuration",
    permissions: [
      {
        id: PERMISSIONS.SETTINGS_READ,
        name: PERMISSIONS.SETTINGS_READ,
        description: "View system settings",
        module: "settings",
        action: "read",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.SETTINGS_WRITE,
        name: PERMISSIONS.SETTINGS_WRITE,
        description: "Modify settings",
        module: "settings",
        action: "write",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.SETTINGS_ADMIN,
        name: PERMISSIONS.SETTINGS_ADMIN,
        description: "Full settings administration",
        module: "settings",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
  {
    module: "organization",
    label: "Organization Management",
    description: "Billing, members, and organization-wide settings",
    permissions: [
      {
        id: PERMISSIONS.ORG_ADMIN,
        name: PERMISSIONS.ORG_ADMIN,
        description: "Organization administration",
        module: "organization",
        action: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.ORG_BILLING,
        name: PERMISSIONS.ORG_BILLING,
        description: "Billing management",
        module: "organization",
        action: "billing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: PERMISSIONS.ORG_MEMBERS,
        name: PERMISSIONS.ORG_MEMBERS,
        description: "Member management",
        module: "organization",
        action: "members",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
];

// Get all available permissions flattened
export function getAllAvailablePermissions() {
  return PERMISSION_MODULES.flatMap(module => module.permissions);
}

// Get user's effective permissions (from either predefined role or custom role)
export function getUserEffectivePermissions(
  userOrg: ExtendedUserOrganization
): string[] {
  if (userOrg.customRoleId && userOrg.customRole) {
    // User has a custom role
    return userOrg.customRole.permissions.map(
      (p: { permission: { name: string } }) => p.permission.name
    );
  } else if (userOrg.role) {
    // User has a predefined role
    return getPredefinedUserPermissions(userOrg.role);
  }

  // No role assigned
  return [];
}

// Check if user has a specific permission (supports both predefined and custom roles)
export function hasPermission(
  userOrg: ExtendedUserOrganization,
  permission: string
): boolean {
  const userPermissions = getUserEffectivePermissions(userOrg);

  // Direct check first
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Handle hierarchical permissions (admin > write > read)
  const [module, action] = permission.split(":");
  if (!module || !action) {
    return userPermissions.includes(permission); // Non-hierarchical permission
  }

  const adminPermission = `${module}:admin`;
  if (userPermissions.includes(adminPermission)) {
    return true; // Admin has all permissions for this module
  }

  if (action === "read") {
    const writePermission = `${module}:write`;
    if (userPermissions.includes(writePermission)) {
      return true; // Write permission grants read access
    }
  }

  return false;
}

// Check if user has any of the specified permissions
export function hasAnyPermission(
  userOrg: ExtendedUserOrganization,
  permissions: string[]
): boolean {
  return permissions.some(permission => hasPermission(userOrg, permission));
}

// Check if user has all of the specified permissions
export function hasAllPermissions(
  userOrg: ExtendedUserOrganization,
  permissions: string[]
): boolean {
  return permissions.every(permission => hasPermission(userOrg, permission));
}

// Get role type and information for a user
export function getUserRoleType(userOrg: ExtendedUserOrganization): RoleType {
  if (userOrg.customRoleId && userOrg.customRole?.name) {
    return {
      type: "custom",
      customRoleId: userOrg.customRoleId,
      name: userOrg.customRole.name,
      description: userOrg.customRole.description ?? "",
      color: userOrg.customRole.color ?? "bg-blue-100 text-blue-800",
      permissions: getUserEffectivePermissions(userOrg),
    };
  } else if (userOrg.role) {
    const roleInfo = ROLE_INFO[userOrg.role];
    return {
      type: "predefined",
      role: userOrg.role,
      name: roleInfo?.name ?? userOrg.role,
      description: roleInfo?.description ?? "",
      color: roleInfo?.color ?? "bg-gray-100 text-gray-800",
      permissions: getUserEffectivePermissions(userOrg),
      category: roleInfo?.category,
    };
  }

  // Default viewer role
  return {
    type: "predefined",
    role: "VIEWER",
    name: "No Role Assigned",
    description: "No permissions assigned",
    color: "bg-gray-100 text-gray-800",
    permissions: [],
  };
}

// Check if current user can assign a role to another user
export function canAssignRole(
  currentUserOrg: ExtendedUserOrganization,
  targetRoleAssignment: UserRoleAssignment
): boolean {
  // Get current user's role type
  const currentUserRole = getUserRoleType(currentUserOrg);

  // If current user has a predefined role, use existing logic
  if (currentUserRole.type === "predefined" && currentUserRole.role) {
    if (targetRoleAssignment.type === "predefined") {
      return canAssignPredefinedRole(
        currentUserRole.role,
        targetRoleAssignment.role
      );
    }

    // For custom roles, only organization-level roles can assign them
    return ["ORGANIZATION_OWNER", "SUPER_ADMIN", "DEPARTMENT_MANAGER"].includes(
      currentUserRole.role
    );
  }

  // If current user has a custom role, check if they have permission to manage members
  if (currentUserRole.type === "custom") {
    return hasAnyPermission(currentUserOrg, [
      PERMISSIONS.ORG_ADMIN,
      PERMISSIONS.ORG_MEMBERS,
    ]);
  }

  return false;
}

// Check if user can manage roles (create, edit, delete custom roles)
export function canManageCustomRoles(
  userOrg: ExtendedUserOrganization
): boolean {
  return hasAnyPermission(userOrg, [
    PERMISSIONS.ORG_ADMIN,
    PERMISSIONS.SETTINGS_ADMIN,
  ]);
}

// Get permissions that the current user can grant to others
export function getGrantablePermissions(
  userOrg: ExtendedUserOrganization
): string[] {
  const userEffectivePermissions = getUserEffectivePermissions(userOrg);
  const roleType = getUserRoleType(userOrg);

  // If user has a predefined role, use RBAC validation
  if (roleType.type === "predefined" && roleType.role) {
    return getGrantablePermissionsRBAC(roleType.role);
  }

  // For custom roles, be more restrictive
  // User can only grant permissions they have, excluding admin and billing
  return userEffectivePermissions.filter(permission => {
    const [module, action] = permission.split(":");
    if (!module || !action) return false;

    // Never allow granting billing permissions unless explicitly owner
    if (module === "billing" || permission === PERMISSIONS.ORG_BILLING) {
      // Only allow if user has organization owner permissions
      return (
        hasPermission(userOrg, PERMISSIONS.ORG_ADMIN) &&
        hasPermission(userOrg, PERMISSIONS.ORG_BILLING) &&
        userEffectivePermissions.includes(PERMISSIONS.BILLING_ADMIN)
      );
    }

    // Can't grant admin permissions unless user has specific admin permission
    if (action === "admin") {
      return userEffectivePermissions.includes(permission);
    }

    return true;
  });
}

// Validate if user can grant a specific permission
export function canGrantPermission(
  userOrg: ExtendedUserOrganization,
  permission: string
): boolean {
  const grantablePermissions = getGrantablePermissions(userOrg);

  // Direct permission check
  if (grantablePermissions.includes(permission)) {
    return true;
  }

  // Check hierarchical permissions
  const userPermissions = getUserEffectivePermissions(userOrg);
  const [module, action] = permission.split(":");
  if (!module || !action) return false;

  // Check if user has higher level permission for the same module
  const adminPermission = `${module}:admin`;
  if (action !== "admin" && userPermissions.includes(adminPermission)) {
    // Additional check for admin-level permissions
    return (
      hasPermission(userOrg, PERMISSIONS.ORG_ADMIN) ||
      hasPermission(userOrg, PERMISSIONS.SETTINGS_ADMIN)
    );
  }

  const writePermission = `${module}:write`;
  if (action === "read" && userPermissions.includes(writePermission)) {
    return true;
  }

  return false;
}

// Filter available permissions based on what user can grant
export function getFilteredAvailablePermissions(
  userOrg: ExtendedUserOrganization,
  allPermissionGroups: PermissionGroup[]
): Array<
  PermissionGroup & {
    grantablePermissions: PermissionGroup["permissions"];
    canGrantAll: boolean;
  }
> {
  const grantablePermissionNames = getGrantablePermissions(userOrg);

  return allPermissionGroups
    .map(group => {
      const grantablePermissions = group.permissions.filter(
        permission =>
          grantablePermissionNames.includes(permission.name) ||
          canGrantPermission(userOrg, permission.name)
      );

      return {
        ...group,
        grantablePermissions,
        canGrantAll: grantablePermissions.length === group.permissions.length,
      };
    })
    .filter(group => group.grantablePermissions.length > 0); // Only show modules with grantable permissions
}

// Get assignable roles for current user
export function getAssignableRoles(currentUserOrg: ExtendedUserOrganization): {
  predefinedRoles: UserRole[];
  canAssignCustomRoles: boolean;
} {
  const currentUserRole = getUserRoleType(currentUserOrg);

  if (currentUserRole.type === "predefined" && currentUserRole.role) {
    return {
      predefinedRoles: Object.keys(ROLE_INFO).filter(role =>
        canAssignPredefinedRole(currentUserRole.role!, role as UserRole)
      ) as UserRole[],
      canAssignCustomRoles: [
        "ORGANIZATION_OWNER",
        "SUPER_ADMIN",
        "DEPARTMENT_MANAGER",
      ].includes(currentUserRole.role),
    };
  }

  if (currentUserRole.type === "custom") {
    const canManageMembers = hasAnyPermission(currentUserOrg, [
      PERMISSIONS.ORG_ADMIN,
      PERMISSIONS.ORG_MEMBERS,
    ]);

    return {
      predefinedRoles: canManageMembers
        ? (Object.keys(ROLE_INFO) as UserRole[])
        : [],
      canAssignCustomRoles: canManageMembers,
    };
  }

  return {
    predefinedRoles: [],
    canAssignCustomRoles: false,
  };
}

// Validate custom role permissions with hierarchical checking
export function validateCustomRolePermissions(
  userOrg: ExtendedUserOrganization,
  permissionNames: string[]
): {
  valid: boolean;
  errors: string[];
  ungrantablePermissions: string[];
} {
  const errors: string[] = [];
  const ungrantablePermissions: string[] = [];

  // Get user's role type for validation
  const roleType = getUserRoleType(userOrg);

  // Use RBAC validation for predefined roles
  if (roleType.type === "predefined" && roleType.role) {
    return validateCustomRolePermissionsRBAC(roleType.role, permissionNames);
  }

  // For custom roles, validate each permission individually
  const availablePermissionNames = getAllAvailablePermissions().map(
    p => p.name
  );

  // Check for invalid permissions
  const invalid = permissionNames.filter(
    name => !availablePermissionNames.includes(name)
  );
  if (invalid.length > 0) {
    errors.push(`Invalid permissions: ${invalid.join(", ")}`);
  }

  // Check if user can grant each permission
  for (const permission of permissionNames) {
    if (!canGrantPermission(userOrg, permission)) {
      ungrantablePermissions.push(permission);

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
          `You cannot grant permission (${permission}) because you don't have sufficient privileges`
        );
      }
    }
  }

  // Must include at least one read permission
  const hasRead = permissionNames.some(name => name.endsWith(":read"));
  if (!hasRead && permissionNames.length > 0) {
    errors.push("Role must have at least one read permission");
  }

  return {
    valid: errors.length === 0,
    errors,
    ungrantablePermissions,
  };
}

// Create navigation permissions helper for custom roles
export function getCustomNavPermissions(userOrg: ExtendedUserOrganization) {
  const userPermissions = getUserEffectivePermissions(userOrg);

  const canAccessModule = (module: string) =>
    userPermissions.some(permission =>
      permission.startsWith(`${module.toLowerCase()}:`)
    );

  const canWriteToModule = (module: string) =>
    userPermissions.some(
      permission =>
        permission === `${module.toLowerCase()}:write` ||
        permission === `${module.toLowerCase()}:admin`
    );

  return {
    canViewCRM: canAccessModule("crm"),
    canViewProjects: canAccessModule("projects"),
    canViewFinance: canAccessModule("finance"),
    canViewHR: canAccessModule("hr"),
    canViewMarketing: canAccessModule("marketing"),
    canViewCollaboration: canAccessModule("collaboration"),
    canViewSettings: canAccessModule("settings"),

    canWriteCRM: canWriteToModule("crm"),
    canWriteProjects: canWriteToModule("projects"),
    canWriteFinance: canWriteToModule("finance"),
    canWriteHR: canWriteToModule("hr"),
    canWriteMarketing: canWriteToModule("marketing"),
    canWriteCollaboration: canWriteToModule("collaboration"),
    canWriteSettings: canWriteToModule("settings"),

    canManageOrganization: userPermissions.includes(PERMISSIONS.ORG_ADMIN),
    canManageMembers: userPermissions.includes(PERMISSIONS.ORG_MEMBERS),
    canManageBilling: userPermissions.includes(PERMISSIONS.ORG_BILLING),
  };
}

// Helper to format permission name for display
export function formatPermissionName(permission: string): string {
  return permission
    .replace(/:/g, ": ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper to get permission color based on action
export function getPermissionColor(permission: string): string {
  if (permission.includes(":read")) return "bg-blue-100 text-blue-800";
  if (permission.includes(":write")) return "bg-green-100 text-green-800";
  if (permission.includes(":admin")) return "bg-red-100 text-red-800";
  if (permission.includes(":delete")) return "bg-red-100 text-red-800";
  if (permission.includes(":billing")) return "bg-yellow-100 text-yellow-800";
  if (permission.includes(":members")) return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
}
