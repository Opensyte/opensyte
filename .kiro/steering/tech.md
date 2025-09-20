# Technology Stack & Development Guide

## Core Technologies

- **Framework**: Next.js 15 with App Router
- **Runtime**: Bun (package manager and runtime)
- **Language**: TypeScript with strict configuration
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS v4 with CSS variables
- **UI Components**: Shadcn/ui (New York style)
- **API**: tRPC for type-safe APIs
- **Authentication**: Better Auth with Google OAuth
- **State Management**: Jotai for client state
- **Email**: Resend for transactional emails
- **SMS**: Twilio (optional)

## Key Libraries

- **Forms**: React Hook Form with Zod validation
- **UI**: Radix UI primitives, Lucide React icons
- **Data Fetching**: TanStack Query (React Query)
- **Drag & Drop**: @dnd-kit for sortable interfaces
- **Rich Text**: Tiptap editor
- **PDF Generation**: PDF-lib and PDFKit
- **Date Handling**: date-fns
- **Charts**: Custom chart components with CSS variables

## Development Commands

```bash
# Development
bun run dev          # Start dev server with Turbo
bun run dev --turbo  # Explicit turbo mode

# Database
bun run db:push      # Push schema changes to database
bun run db:generate  # Generate Prisma client and run migrations
bun run db:migrate   # Deploy migrations to production
bun run db:studio    # Open Prisma Studio

# Code Quality
bun run lint         # Run ESLint
bun run lint:fix     # Fix ESLint issues automatically
bun run typecheck    # Run TypeScript compiler check
bun run check        # Run both lint and typecheck

# Formatting
bun run format:check # Check Prettier formatting
bun run format:write # Apply Prettier formatting

# Build & Deploy
bun run build        # Build for production
bun run start        # Start production server
bun run preview      # Build and start production server

# UI Components
bun run shadcn       # Add new Shadcn/ui components
```

## Environment Setup

- Copy `.env.example` to `.env`
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`
- Optional: Google OAuth, Twilio SMS credentials
- Use `./start-database.sh` for local PostgreSQL (Docker/Podman)

## Code Style & Conventions

- ESLint with TypeScript recommended rules
- Prettier with Tailwind CSS plugin for class sorting
- Consistent type imports with `type` keyword
- Unused variables prefixed with underscore
- CSS variables for theming (light/dark mode support)
