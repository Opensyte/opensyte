# Permission System Implementation Guide

This guide explains how the permission system has been implemented to prevent users from accessing pages they don't have permission for.

## Overview

The system provides both server-side and client-side permission checking to ensure users only see pages and content they have access to based on their role in the organization.

## Components

### 1. Server-Side Permission Checking

**File:** `src/lib/server-auth-utils.ts`

Utility functions for server-side permission checking:

- `getUserOrganizationRole(organizationId)` - Gets user's role in an organization
- `getCurrentUserId()` - Gets the current authenticated user's ID
- `hasOrganizationAccess(organizationId)` - Checks if user is a member of the organization

**File:** `src/components/shared/permission-guard.tsx`

Server-side permission guard component and helper functions:

- `PermissionGuard` - Main component for wrapping pages with permission checks
- `withCRMPermissions()` - Helper for CRM module access
- `withHRPermissions()` - Helper for HR module access
- `withFinancePermissions()` - Helper for Finance module access
- `withProjectPermissions()` - Helper for Project module access
- `withSettingsPermissions()` - Helper for Settings module access

### 2. Client-Side Permission Checking

**File:** `src/components/shared/client-permission-guard.tsx`

Client-side permission guard for pages that use `"use client"`:

- `ClientPermissionGuard` - Main component for client-side permission checking
- `withClientCRMPermissions()` - Helper for CRM module access
- `withClientHRPermissions()` - Helper for HR module access
- `withClientFinancePermissions()` - Helper for Finance module access
- `withClientProjectPermissions()` - Helper for Project module access
- `withClientSettingsPermissions()` - Helper for Settings module access

## Usage

### Server-Side Pages (Default)

For server-side rendered pages, use the server-side permission guards:

```tsx
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withCRMPermissions } from "~/components/shared/permission-guard";

export default async function MyPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return withCRMPermissions(
    <div>{/* Your page content */}</div>,
    userRole,
    orgId
  );
}
```

### Client-Side Pages ("use client")

For client-side pages, use the client-side permission guards:

```tsx
"use client";

import { withClientCRMPermissions } from "~/components/shared/client-permission-guard";

export default function MyClientPage() {
  return withClientCRMPermissions(<div>{/* Your page content */}</div>);
}
```

### Custom Permission Checking

For more granular control, use the main components directly:

```tsx
// Server-side
import { PermissionGuard } from "~/components/shared/permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

<PermissionGuard
  userRole={userRole}
  requiredAnyPermissions={[PERMISSIONS.CRM_READ, PERMISSIONS.CRM_WRITE]}
  organizationId={orgId}
>
  {/* Protected content */}
</PermissionGuard>;

// Client-side
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

<ClientPermissionGuard requiredPermissions={[PERMISSIONS.FINANCE_ADMIN]}>
  {/* Protected content */}
</ClientPermissionGuard>;
```

## Permission Types

You can specify different types of permission requirements:

- `requiredPermissions` - User must have ALL specified permissions
- `requiredAnyPermissions` - User must have AT LEAST ONE of the specified permissions
- `requiredModule` - User must have access to the specified module (crm, hr, finance, etc.)

## Permission Error Messages

When users don't have permission, they see a friendly error page with:

- Clear explanation of why access was denied
- Their current role displayed
- Required permissions listed (if applicable)
- Button to navigate back to dashboard or sign in

## Implementation Status

The following pages have been updated with permission checking:

### CRM Module

- ✅ `/[orgId]/crm/pipeline` - Server-side (CRM permissions required)
- ✅ `/[orgId]/crm/contacts` - Client-side (CRM permissions required)
- ✅ `/[orgId]/crm/interactions` - Client-side (CRM permissions required)

### HR Module

- ✅ `/[orgId]/hr/employees` - Server-side (HR permissions required)
- ✅ `/[orgId]/hr/payroll` - Server-side (HR permissions required)
- ✅ `/[orgId]/hr/timeoff` - Server-side (HR permissions required)
- ✅ `/[orgId]/hr/performance` - Server-side (HR permissions required)

### Finance Module

- ✅ `/[orgId]/finance/invoices` - Server-side (Finance permissions required)

### Project Module

- ✅ `/[orgId]/projects/[projectId]` - Server-side (Project permissions required)

### Settings Module

- ✅ `/[orgId]/settings/team` - Client-side (ORG_MEMBERS or ORG_ADMIN required)
- ✅ `/[orgId]/settings/invitations` - Server-side (ORG_MEMBERS or ORG_ADMIN required)

## Next Steps

To add permission checking to new pages:

1. Determine if the page is server-side or client-side
2. Import the appropriate permission guard helper
3. Wrap your page content with the permission check
4. Test with different user roles to ensure proper access control

## Role-Based Access Control (RBAC)

The system uses a comprehensive RBAC implementation with roles like:

- Organization roles (ORGANIZATION_OWNER, SUPER_ADMIN, DEPARTMENT_MANAGER)
- Departmental roles (HR_MANAGER, SALES_MANAGER, FINANCE_MANAGER, PROJECT_MANAGER)
- Standard roles (EMPLOYEE, CONTRACTOR, VIEWER)

Each role has specific permissions that determine access to different modules and features.
