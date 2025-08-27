---
applyTo: "**"
---

# Coding Standards & Guidelines

## General Rules

- Use the components folder for anything related to UI or client components
- Use only page.tsx files for server-side rendering (SSR)
- Always fix ESLint and TypeScript type errors before committing
- When using JSON sample data for testing, ensure it conforms to the Prisma schema
- every page you create make it responsive
- ALWAYS use ?? instead of ||
- Use the generated zod schema at prisma/generated/zod/index.ts
- If a type already exists in Prisma, do not redefine it here.
- Always use the Prisma types directly to maintain consistency.

## Project Structure

- Place client components in `src/components/`
- Use `"use client"` directive for client components
- Organize components by feature or domain when possible
- Keep utility functions in `src/lib/` or `src/utils/`

## T3 Stack Guidelines

### Next.js

- Follow App Router patterns and conventions
- Use layout files for shared UI across routes
- Implement proper loading and error states
- Use metadata exports for SEO optimization

### TypeScript

- Use strict typing - avoid `any` and `unknown` types when possible
- Create reusable interfaces and types in domain-specific files
- Use Zod for runtime validation and type inference

### tRPC

- Create domain-specific routers in `src/server/api/routers/`
- Use input validation with Zod for all procedures
- Implement proper error handling with context
- Follow RESTful naming conventions for procedures

### Prisma

- Keep schema.prisma organized and well-documented
- Use meaningful relation names
- Implement proper indexing for performance
- Use transactions for multi-table operations
- Ensure all JSON sample data matches schema definitions when testing

### Styling

- Use Tailwind CSS utility classes following mobile-first approach
- Create component-specific CSS modules when needed
- Use consistent spacing and layout patterns

### State Management

- Use React hooks for local state
- Consider Zustand or Jotai for global state when needed
- Implement proper loading states and error handling

### UI Components & Dialogs

- All dialogs and modals must be responsive and mobile-friendly
- Use `max-h-[90vh] overflow-y-auto` for dialog content to ensure proper scrolling on mobile devices
- Implement responsive button layouts in dialog footers: `flex flex-col gap-2 sm:flex-row sm:gap-0`
- Use `w-full sm:w-auto` for buttons to make them full-width on mobile and auto-width on desktop
- Ensure form fields are properly spaced and responsive with grid layouts that adapt to screen size
- Always make the first letter is capital and the rest is small when using badges

## Performance

- Use proper code splitting and lazy loading
- Optimize images with Next.js Image component
- Implement proper caching strategies
- Minimize client-side JavaScript

## Permission & Authorization (RBAC)

- **ALWAYS implement permission checks when creating new features**
- Use the RBAC system in `src/lib/rbac.ts` for all permission validations

### Permission Components & Usage

- **ClientPermissionGuard Component:**

  - Import from `src/components/shared/client-permission-guard.tsx`
  - Wrap protected content with this component to enforce permissions
  - Use the following props:
    - `requiredPermissions`: Array of permissions the user must have ALL of
    - `requiredAnyPermissions`: Array of permissions where user needs at least ONE
    - `requiredModule`: Check if user has any access to a specific module
    - `fallback`: Optional custom component to show when permission is denied
    - `loadingComponent`: Optional custom loading component
  - Example:
    ```tsx
    <ClientPermissionGuard
      requiredAnyPermissions={[PERMISSIONS.CRM_READ, PERMISSIONS.CRM_WRITE]}
      requiredModule="crm"
    >
      <ProtectedContent />
    </ClientPermissionGuard>
    ```

- **Module-Specific Permission Wrappers:**

  - Use convenient wrapper functions for common module permissions:
    - `withClientCRMPermissions(<Component />)`
    - `withClientHRPermissions(<Component />)`
    - `withClientFinancePermissions(<Component />)`
    - `withClientProjectPermissions(<Component />)`
    - `withClientSettingsPermissions(<Component />)`

- **usePermissions Hook:**

  - Import from `src/hooks/use-permissions.ts`
  - Use for granular permission checks inside components
  - Provides readable properties like `canReadCRM`, `canWriteHR`, etc.
  - Example:

    ```tsx
    const { canWriteCRM, isLoading } = usePermissions({
      userId: session?.user.id,
      organizationId: params.orgId,
    });

    return <>{canWriteCRM && <EditButton />}</>;
    ```

- **useModulePermissions Hook:**
  - Simplified hook for checking permissions for a specific module
  - Returns `{ canRead, canWrite, canView, isLoading, isError }`

### Frontend/UI Requirements

- Hide/disable UI elements (buttons, forms, menus) based on user permissions
- Use `hasPermission()`, `hasAnyPermission()`, or `getNavPermissions()` from rbac.ts
- Check permissions like: `canWrite[Module]`, `can[Action][Module]` before showing editing/creating/deleting UI
- Show read-only states or permission denied messages when appropriate

### Backend/tRPC Requirements

- Validate permissions in ALL tRPC procedures that modify data
- Check permissions at the procedure level using user role from context
- Throw `TRPCError` with code "FORBIDDEN" when user lacks required permissions
- Example: Require `PERMISSIONS.CRM_WRITE` for creating/editing CRM data

### Module-specific permission patterns

- CRM: `crm:read`, `crm:write`, `crm:admin`
- HR: `hr:read`, `hr:write`, `hr:admin`
- Finance: `finance:read`, `finance:write`, `finance:admin`
- Projects: `projects:read`, `projects:write`, `projects:admin`
- Settings: `settings:read`, `settings:write`, `settings:admin`

### Permission Design Guidelines

- Design permission denial screens with clear, user-friendly messages
- Use appropriate icons and colors to indicate permission status
- Make the first denied permission message explain what access is needed
- Always provide a way to navigate back or request access
- **Never assume a user has permission** - always validate both frontend and backend
