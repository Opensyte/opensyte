# Permission Hierarchy System - Implementation Guide

## Overview

The hierarchical permission system has been implemented in Opensyte to ensure that only users with appropriate privileges can create and manage custom roles. This system follows the principle of least privilege and prevents privilege escalation attacks.

## Key Features Implemented

### 1. Role Hierarchy Levels

```
6. ORGANIZATION_OWNER (highest)
5. SUPER_ADMIN
4. DEPARTMENT_MANAGER
3. Departmental roles (HR_MANAGER, SALES_MANAGER, etc.)
2. EMPLOYEE
1. VIEWER, CONTRACTOR (lowest)
```

### 2. Permission Validation Rules

#### Billing Permissions (Owner-Only)

- `billing:read`
- `billing:manage`
- `billing:admin`
- Only ORGANIZATION_OWNER can create roles with billing permissions

#### Admin Permission Inheritance

- Users can only grant admin permissions (`module:admin`) if they have that specific admin permission themselves
- Example: To grant `crm:admin`, user must have `crm:admin` or higher

#### Hierarchical Permission Access

- `admin` level includes `write` and `read` permissions for the same module
- `write` level includes `read` permissions for the same module
- Users cannot grant permissions they don't possess

### 3. Custom Role Creation Authorization

#### Who Can Create Custom Roles?

- ORGANIZATION_OWNER (full access)
- SUPER_ADMIN (restricted access)
- Users with `organization:admin` or `settings:admin` permissions

#### Permission Filtering by User Role

- **Owner**: Can grant all permissions including billing
- **Super Admin**: Can grant all permissions except billing
- **Others**: Can only grant permissions they have, excluding admin-level

## Implementation Details

### Frontend Changes

1. **Permission UI Filtering**: Only shows permissions user can grant
2. **Visual Indicators**: Locked permissions with tooltips explaining restrictions
3. **Validation Messages**: Clear error messages when permissions cannot be granted

### Backend Validation

1. **Role-based Permission Checking**: Validates each requested permission against user's grantable permissions
2. **Hierarchical Validation**: Checks if user has higher-level permissions to grant lower-level ones
3. **Billing Protection**: Prevents non-owners from creating roles with billing permissions

### Database Schema

- Existing schema supports the new permission system
- Added billing permissions to seed data
- Custom roles link to permissions via junction table

## Usage Examples

### Example 1: Super Admin Creating Custom Role

```typescript
// Super Admin trying to create a role with billing permissions
const validation = validateCustomRolePermissions("SUPER_ADMIN", [
  "crm:read",
  "billing:admin",
]);
// Result: { valid: false, errors: ['Cannot grant billing permissions - only Owner'] }
```

### Example 2: HR Manager Creating Custom Role

```typescript
// HR Manager trying to grant CRM admin permissions
const validation = validateCustomRolePermissions("HR_MANAGER", [
  "hr:admin",
  "crm:admin",
]);
// Result: { valid: false, errors: ['Cannot grant CRM admin - you don\'t have CRM admin'] }
```

### Example 3: Owner Creating Custom Role

```typescript
// Organization Owner can grant any permission
const validation = validateCustomRolePermissions("ORGANIZATION_OWNER", [
  "crm:admin",
  "billing:admin",
  "hr:write",
]);
// Result: { valid: true, errors: [] }
```

## Security Benefits

### Permission Synchronization Security

1. **Data Integrity**: Ensures database permissions match RBAC library definitions
2. **Safe Updates**: Uses database transactions for atomic permission updates
3. **Custom Role Protection**: Preserves existing custom role assignments during sync
4. **Controlled Removal**: Only removes obsolete permissions if they're not in use
5. **Automatic Consistency**: Prevents permission drift between code and database

### Hierarchy Security

1. **Prevents Privilege Escalation**: Users cannot create roles with higher privileges than they possess
2. **Protects Billing Access**: Only Organization Owners can manage billing-related permissions
3. **Maintains Administrative Oversight**: Proper role hierarchy ensures accountability
4. **Enforces Least Privilege**: Users can only grant minimum necessary permissions
5. **Provides Clear Feedback**: Users understand exactly why certain permissions are restricted

## Error Messages

The system provides clear error messages:

- `"You cannot grant billing permissions - only Organization Owners can manage billing"`
- `"You cannot grant admin permissions (crm:admin) because you don't have admin access to crm"`
- `"You cannot grant permission (projects:write) because you don't have sufficient privileges"`

## Testing the Implementation

### Permission Synchronization Testing

1. **Sync Status Check**: Use the permission sync analyzer to check database consistency
2. **Force Sync Test**: Manually trigger sync with `force: true` to update all permissions
3. **Auto-sync Test**: Open custom role dialog to trigger automatic synchronization
4. **Custom Role Preservation**: Verify existing custom roles are maintained during sync

### Hierarchy Testing

To test the permission system:

1. **Owner Test**: Log in as Organization Owner and verify all permissions are available
2. **Super Admin Test**: Log in as Super Admin and verify billing permissions are locked
3. **Manager Test**: Log in as departmental manager and verify only relevant permissions are available
4. **Employee Test**: Log in as Employee and verify role creation is not available

### Sync Analysis Tools

```typescript
// Analyze current sync status
const analysis = PermissionSyncAnalyzer.analyzeSyncStatus(dbPermissions);
console.log(analysis.needsSync); // true/false
console.log(analysis.statistics.syncPercentage); // 0-100%

// Generate detailed report
const report = PermissionSyncAnalyzer.generateSyncReport(dbPermissions);
console.log(report); // Human-readable sync status
```

## API Endpoints

### Permission Synchronization

- `syncPermissions`: Intelligently syncs database permissions with RBAC library definitions
  - Parameters: `userId`, `organizationId`, `force?` (boolean)
  - Returns: Sync statistics and results
  - Features: Transaction-based, preserves custom roles, detailed error reporting

### Permission Management

- `getAvailablePermissions`: Returns filtered permissions based on user role (with auto-sync)
  - Parameters: `userId`, `organizationId`, `autoSync?` (boolean)
  - Features: Automatic sync on access, hierarchical filtering
- `createCustomRole`: Validates permissions against user's grantable permissions
- `updateCustomRole`: Re-validates all permissions when updating roles

### Synchronization Features

```typescript
// Example sync result
{
  success: true,
  syncResults: {
    added: 3,      // New permissions added
    updated: 1,    // Existing permissions updated
    removed: 0,    // Obsolete permissions removed
    errors: []     // Any sync errors
  },
  needsSync: true, // Whether changes were made
  message: "Permission sync completed: 4 changes made"
}
```

This implementation ensures that custom role creation follows proper authorization hierarchies while maintaining usability and providing clear feedback to users.
