# Project Structure & Organization

## Root Directory Structure

```
opensyte/
├── .kiro/                    # Kiro AI assistant configuration
├── docs/                     # Documentation and guides
├── prisma/                   # Database schema and migrations
│   ├── migrations/           # Database migration files
│   ├── generated/            # Generated Prisma client
│   └── schema.prisma         # Main database schema
├── public/                   # Static assets (icons, images)
├── src/                      # Main application source code
└── start-database.sh         # Local database setup script
```

## Source Code Organization (`src/`)

### App Router Structure (`src/app/`)

- `(auth)/` - Authentication pages (login, register)
- `(dashboard)/` - Main application dashboard and features
- `accept-invite/` - Organization invitation acceptance
- `api/` - API routes and endpoints

### Components (`src/components/`)

Organized by feature domains:

- `ai/` - AI-related components
- `auth/` - Authentication UI components
- `crm/` - Customer relationship management
- `dashboard/` - Dashboard layouts and widgets
- `finance/` - Financial management (invoices, expenses)
- `hr/` - Human resources management
- `invitations/` - User invitation system
- `organizations/` - Multi-tenant organization management
- `projects/` - Project management features
- `rbac/` - Role-based access control
- `settings/` - Application settings
- `shared/` - Reusable components across features
- `templates/` - Workflow templates
- `ui/` - Base UI components (Shadcn/ui)
- `workflow/` & `workflows/` - Workflow automation

### Core Infrastructure

- `hooks/` - Custom React hooks
- `lib/` - Utility functions and business logic
- `server/` - Server-side code (API, database, email)
- `trpc/` - tRPC configuration and client setup
- `types/` - TypeScript type definitions
- `styles/` - Global CSS and Tailwind configuration

## Key Architectural Patterns

### Multi-Tenant Architecture

- Organization-based data isolation
- Role-based access control (RBAC)
- Custom roles and permissions system

### Feature-Based Organization

- Components grouped by business domain
- Dedicated type definitions per feature
- Modular API routes in tRPC routers

### Database Schema Organization

- Core models: User, Organization, UserOrganization
- Feature modules: CRM, Projects, Finance, HR
- RBAC: Permissions, Roles, CustomRoles
- Workflow automation system

## File Naming Conventions

- **Components**: PascalCase (e.g., `CustomerList.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePermissions.ts`)
- **Types**: camelCase files, PascalCase exports (e.g., `crm.ts` exports `Customer`)
- **API Routes**: kebab-case directories, camelCase files
- **Utilities**: camelCase (e.g., `auth-client.ts`)

## Import Path Aliases

- `~/` - Maps to `src/` directory
- `~/components` - UI components
- `~/lib` - Utility functions
- `~/hooks` - Custom hooks
- `~/types` - Type definitions
- `~/server` - Server-side code

## Configuration Files

- `components.json` - Shadcn/ui configuration
- `tsconfig.json` - TypeScript configuration with strict mode
- `eslint.config.js` - ESLint with TypeScript rules
- `prettier.config.js` - Code formatting with Tailwind plugin
- `postcss.config.js` - PostCSS with Tailwind CSS v4
