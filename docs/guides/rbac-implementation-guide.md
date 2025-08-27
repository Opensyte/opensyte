# RBAC Permission System Implementation Guide

## Overview

This guide demonstrates how to implement Role-Based Access Control (RBAC) in our application with both backend validation and frontend UI permission hiding. The system ensures users can only access features they have permissions for.

## Core Components

### 1. Backend Permission Validation

#### Permission Middleware (src/server/api/trpc.ts)

```typescript
// Use these procedures instead of publicProcedure
const createPermissionProcedure = (permission: string) =>
  privateProcedure.use(async ({ ctx, next }) => {
    if (!hasPermission(ctx.session.user, permission, ctx.organizationId)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });

const createAnyPermissionProcedure = (permissions: string[]) =>
  privateProcedure.use(async ({ ctx, next }) => {
    if (!hasAnyPermission(ctx.session.user, permissions, ctx.organizationId)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
```

#### Router Implementation Pattern

```typescript
// For read operations
.query(async ({ ctx }) => {
  // Your logic here
})

// For write operations
createPermissionProcedure(PERMISSIONS.CRM_WRITE)
.input(z.object({
  organizationId: z.string(),
  // other fields
}))
.mutation(async ({ input, ctx }) => {
  // Your logic here
});

// For operations requiring multiple permission levels
createAnyPermissionProcedure([
  PERMISSIONS.CRM_READ,
  PERMISSIONS.CRM_WRITE,
  PERMISSIONS.CRM_ADMIN
])
```

### 2. Frontend Permission Components

#### PermissionButton Component

```typescript
<PermissionButton
  userId={session.user.id}
  organizationId={organizationId}
  requiredPermission="write"
  module="crm"
  variant="default"
  onClick={() => handleCreateContact()}
>
  <Plus className="mr-2 h-4 w-4" />
  Add Contact
</PermissionButton>
```

#### WithPermissions Wrapper

```typescript
<WithPermissions
  userId={session.user.id}
  organizationId={organizationId}
  requiredPermission="admin"
  module="hr"
  fallback={<p>Admin access required</p>}
>
  <AdminPanel />
</WithPermissions>
```

#### usePermissionCheck Hook

```typescript
const { hasPermission, isLoading } = usePermissionCheck(
  session.user.id,
  organizationId,
  "write",
  "finance"
);

if (isLoading) return <Skeleton />;
if (!hasPermission) return null;

return <FinanceEditor />;
```

## Implementation Steps

### Step 1: Update Router Files

1. Import permission middleware:

```typescript
import {
  createPermissionProcedure,
  createAnyPermissionProcedure,
} from "~/server/api/trpc";
import { PERMISSIONS } from "~/lib/rbac";
```

2. Replace procedures:

```typescript
// OLD
export const contactRouter = createTRPCRouter({
  create: publicProcedure
    .input(createContactSchema)
    .mutation(async ({ input, ctx }) => {
      // logic
    }),
});

// NEW
export const contactRouter = createTRPCRouter({
  create: createPermissionProcedure(PERMISSIONS.CRM_WRITE)
    .input(
      createContactSchema.extend({
        organizationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // logic
    }),
});
```

### Step 2: Update UI Components

1. Import permission components:

```typescript
import {
  PermissionButton,
  WithPermissions,
  usePermissionCheck,
} from "~/components/shared/permission-button";
import { useSession } from "~/lib/auth-client";
```

2. Replace regular buttons:

```typescript
// OLD
<Button onClick={handleCreate}>
  Add Item
</Button>

// NEW
<PermissionButton
  userId={session.user.id}
  organizationId={organizationId}
  requiredPermission="write"
  module="crm"
  onClick={handleCreate}
>
  Add Item
</PermissionButton>
```

3. Wrap sensitive sections:

```typescript
// OLD
<div>
  <AdminSettings />
</div>

// NEW
<WithPermissions
  userId={session.user.id}
  organizationId={organizationId}
  requiredPermission="admin"
  module="settings"
>
  <AdminSettings />
</WithPermissions>
```

### Step 3: Handle Form Submissions

Add organizationId to all mutations:

```typescript
const createContact = api.crm.contacts.create.useMutation({
  onSuccess: () => {
    toast.success("Contact created");
    onClose();
  },
});

const handleSubmit = (data: ContactFormData) => {
  createContact.mutate({
    ...data,
    organizationId, // Always include this
  });
};
```

## Permission Levels

### Module Permissions

- **read**: View data only
- **write**: Create, update data
- **admin**: Full control including deletion

### Available Modules

- `crm`: Customer relationship management
- `hr`: Human resources
- `finance`: Financial management
- `projects`: Project management
- `marketing`: Marketing campaigns
- `settings`: System configuration

## Best Practices

### 1. Always Validate Backend First

Never trust frontend permission checks alone. Always validate on the backend.

### 2. Graceful Degradation

Show appropriate fallbacks for missing permissions:

```typescript
<WithPermissions
  requiredPermission="write"
  module="crm"
  fallback={<p>Contact your admin for edit access</p>}
>
  <EditForm />
</WithPermissions>
```

### 3. Loading States

Handle permission loading appropriately:

```typescript
const { hasPermission, isLoading } = usePermissionCheck(...);

if (isLoading) return <Skeleton className="h-10 w-32" />;
if (!hasPermission) return null;
```

### 4. Error Handling

Handle permission errors in mutations:

```typescript
const mutation = api.crm.contacts.create.useMutation({
  onError: error => {
    if (error.data?.code === "FORBIDDEN") {
      toast.error("You don't have permission to perform this action");
    } else {
      toast.error("Something went wrong");
    }
  },
});
```

## Testing Permissions

### 1. Test Different User Roles

Create test users with different permission levels:

- Read-only user
- Editor user
- Admin user

### 2. Verify UI Hiding

Check that:

- Buttons are hidden/disabled for unauthorized users
- Sections don't render without proper permissions
- Fallback messages are shown appropriately

### 3. Verify Backend Protection

Test API endpoints with unauthorized tokens to ensure they return 403 errors.

## Common Patterns

### 1. Table Row Actions

```typescript
<div className="flex gap-2">
  <PermissionButton
    requiredPermission="read"
    module="crm"
    size="sm"
    variant="outline"
  >
    <Eye className="h-4 w-4" />
  </PermissionButton>

  <PermissionButton
    requiredPermission="write"
    module="crm"
    size="sm"
  >
    <Edit className="h-4 w-4" />
  </PermissionButton>

  <PermissionButton
    requiredPermission="admin"
    module="crm"
    size="sm"
    variant="destructive"
  >
    <Trash2 className="h-4 w-4" />
  </PermissionButton>
</div>
```

### 2. Conditional Navigation

```typescript
const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    // Always visible
  },
  {
    name: "CRM",
    href: "/crm",
    requiredPermission: "read",
    module: "crm",
  },
  {
    name: "HR Admin",
    href: "/hr/admin",
    requiredPermission: "admin",
    module: "hr",
  },
];
```

### 3. Bulk Actions

```typescript
<WithPermissions
  requiredPermission="admin"
  module="crm"
>
  <BulkDeleteButton
    selectedItems={selectedContacts}
    onDelete={handleBulkDelete}
  />
</WithPermissions>
```

## Troubleshooting

### Common Issues

1. **"Cannot read property of undefined"**: Ensure session and organizationId are available before rendering permission components.

2. **Infinite loading**: Check that the permission hook receives valid userId and organizationId.

3. **Permission denied on valid actions**: Verify the user's role has the required permission in the RBAC configuration.

4. **UI shows but API fails**: Ensure both frontend and backend use the same permission constants.

## Migration Checklist

- [ ] Update all router procedures to use permission middleware
- [ ] Add organizationId validation to all mutations
- [ ] Replace buttons with PermissionButton where appropriate
- [ ] Wrap admin sections with WithPermissions
- [ ] Add permission checks to navigation
- [ ] Test with different user roles
- [ ] Update any existing tests

This implementation ensures a secure, consistent permission system across the entire application.
