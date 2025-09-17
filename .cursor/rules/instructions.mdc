---
description:
globs:
alwaysApply: true
---
## Project Overview

OpenSyte is an open-source all-in-one business management software built with the T3 stack (Next.js, TypeScript, tRPC, Prisma). It provides comprehensive modules for CRM, Project Management, Finance, HR, and Workflow Automation.

## Key Development Commands

### Setup & Installation
```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Set up database (Linux/macOS)
./start-database.sh

# Set up database schema
bun run db:push

# Generate Prisma client and zod schemas
bun run postinstall
```

### Development
```bash
# Start development server with Turbo
bun run dev

# Type checking
bun run typecheck

# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Check code format
bun run format:check

# Format code
bun run format:write

# Full code check (lint + typecheck)
bun run check
```

### Database Operations
```bash
# Generate and apply migrations in development
bun run db:generate

# Deploy migrations to production
bun run db:migrate

# Push schema changes without migrations
bun run db:push

# Open Prisma Studio database GUI
bun run db:studio
```

### Testing & Building
```bash
# Build for production
bun run build

# Start production server
bun run start

# Preview build locally
bun run preview
```

### Shadcn UI Components
```bash
# Add new shadcn/ui components
bun run shadcn add <component-name>
```

## Architecture Overview

### Core Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict typing
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe API routes
- **Authentication**: Better Auth with Google OAuth
- **UI**: Tailwind CSS + shadcn/ui components
- **State Management**: Jotai for global state, React Query for server state
- **Runtime**: Bun for package management and development

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application routes
│   └── accept-invite/     # Invitation acceptance flow
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui base components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard-specific components
│   └── [module]/         # Module-specific components (CRM, HR, etc.)
├── server/
│   ├── api/              # tRPC API implementation
│   │   └── routers/      # Feature-specific routers
│   └── db.ts             # Database connection
├── lib/                  # Utility functions and configurations
└── styles/               # Global CSS styles
```

### Module Architecture

The application is organized into distinct business modules:

#### 1. CRM Module (`src/server/api/routers/crm/`)
- **Contacts**: Customer and lead management
- **Deals**: Sales pipeline tracking with stages
- **Interactions**: Customer communication history

#### 2. Project Management (`src/server/api/routers/projects/`)
- **Projects**: Project creation and management
- **Tasks**: Task management with Kanban and Gantt views
- Hierarchical task structure with subtasks
- Resource allocation and time tracking

#### 3. Finance Module (`src/server/api/routers/finance/`)
- **Invoices**: Invoice generation and management
- **Expenses**: Expense tracking with categories
- **Financial Reports**: Dynamic report generation engine

#### 4. HR Module (`src/server/api/routers/hr/`)
- Employee management and profiles
- Payroll processing and calculations
- Time-off request management
- Performance review system

#### 5. Workflow Automation (`src/server/api/routers/workflows/`)
- Visual workflow designer using React Flow
- Trigger-based automation system
- Integration with external services (Email, SMS, Calendar)
- Variable system for dynamic data handling

### Authentication & Authorization

#### Multi-Tenant Architecture
- Organization-based multi-tenancy
- User-organization relationships with roles
- Invitation-based user onboarding

#### Role-Based Access Control (RBAC)
- **Predefined Roles**: Organization Owner, Super Admin, Department Managers, etc.
- **Custom Roles**: Organization-specific custom roles with granular permissions
- **Permission System**: Module-based permissions (CRM, Finance, HR, Projects)
- **Context-Aware Authorization**: tRPC procedures with permission middleware

#### Key RBAC Components
- `src/lib/rbac.ts`: Predefined role permissions and metadata
- `src/lib/custom-rbac.ts`: Custom role permission checking
- `src/server/api/trpc.ts`: Permission-based procedure middlewares

### Database Design

#### Core Principles
- **Multi-tenant**: All entities scoped to organizations
- **Audit Trail**: CreatedAt/UpdatedAt timestamps on all entities
- **Soft References**: Strategic use of optional foreign keys
- **JSON Fields**: Flexible configuration storage for workflows and reports

#### Key Models
- **Organization**: Tenant isolation boundary
- **UserOrganization**: User-tenant membership with roles
- **Custom Roles**: Dynamic permission assignment
- **Workflow System**: Complete automation framework
- **Financial Reporting**: Configurable report generation

### Development Patterns

#### Component Organization
- Feature-based component grouping (`components/[module]/`)
- Shared UI components in `components/ui/`
- Client/Server component separation following Next.js patterns

#### tRPC Router Structure
- Module-based router organization
- Permission-protected procedures
- Input validation using Zod schemas generated from Prisma

#### Database Schema Generation
- Prisma schema generates both client and Zod validation schemas
- Type-safe database operations throughout the application

## Development Guidelines

### Code Standards
- Always use `??` instead of `||` for null coalescing
- Responsive design is mandatory for all components
- Use Prisma-generated types instead of redefining interfaces
- Follow T3 stack conventions for API routes and components

### UI/Component Guidelines
- All dialogs must be responsive with `max-h-[90vh] overflow-y-auto`
- Button layouts: `flex flex-col gap-2 sm:flex-row sm:gap-0`
- Full-width mobile buttons: `w-full sm:w-auto`
- Badge formatting: First letter capitalized, rest lowercase

### Database Guidelines
- Always scope queries to organization
- Use transactions for multi-table operations
- Ensure JSON sample data matches Prisma schema definitions

### Authentication Context
- Use Better Auth session management
- All protected routes require organization membership validation
- Permission checks should use the custom RBAC system

## Testing Strategy

### Test Structure
- Unit tests for utilities and business logic
- Integration tests for tRPC procedures
- E2E tests for critical user journeys

### Database Testing
- Use separate test database instances
- Seed data should match production schema constraints
- Clean up between test suites

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Application
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
```

### Windows Development Notes
- Use WSL for running the database setup script
- Docker or Podman required for local PostgreSQL instance
- Bun works natively on Windows for package management

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
