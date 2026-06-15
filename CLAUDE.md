# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

OpenSyte is an open-source all-in-one business management app (CRM, Projects, Finance, HR, Workflow Automation) built on the T3 stack: Next.js 15 (App Router) + TypeScript + tRPC v11 + Prisma (PostgreSQL) + Tailwind v4 / shadcn. Auth is **Better Auth** (Google OAuth), not NextAuth. The docs/README use **bun** as the runtime even though `package.json` declares yarn as `packageManager`.

## Commands

```bash
bun run dev            # Next dev server with Turbo
bun run check          # next lint && tsc --noEmit  — run before considering work done
bun run typecheck      # tsc only (high memory budget)
bun run lint:fix       # eslint --fix
bun run format:write   # prettier

bun run db:push        # push schema to DB without a migration (dev iteration)
bun run db:generate    # prisma migrate dev  — creates + applies a migration
bun run db:migrate     # prisma migrate deploy (production)
bun run db:studio      # Prisma Studio GUI
bun run postinstall    # prisma generate (regenerates client + zod schemas)
```

After editing `prisma/schema.prisma`, run `bun run db:push` (or `db:generate`) then `bun run postinstall` so the generated Prisma client **and** the generated Zod schemas at `prisma/generated/zod/index.ts` stay in sync.

Run a single shadcn add: `bun run shadcn add <component>`.

### Tests
Vitest is configured (`vitest.config.ts`, jsdom). **Heads-up:** the `test` scripts in `package.json` point to `src/__tests__/*` files and a `setupFiles` of `src/__tests__/setup.ts` that do not currently exist in the repo, so `bun run test` fails until those are created. A single file runs with `bunx vitest run <path>`.

## Architecture

### Path alias
`~/*` → `src/*` (configured in `tsconfig.json` and `vitest.config.ts`). Always import with `~/...`.

### Request flow
`src/app/(dashboard)/[orgId]/...` (RSC pages) → tRPC client (`src/trpc/`) → routers in `src/server/api/routers/` registered in `src/server/api/root.ts` → Prisma (`src/server/db.ts`). Everything is **multi-tenant**: data is scoped to an `organizationId`, which is the `[orgId]` route segment.

### tRPC procedures & permissions (`src/server/api/trpc.ts`)
Three building blocks:
- `publicProcedure` — timing middleware only.
- `protectedProcedure` — requires a logged-in user **and** early-access (see below).
- `createPermissionProcedure(PERMISSIONS.X)` / `createAnyPermissionProcedure([...])` — protected + inject a `ctx.requirePermission(orgId)` / `ctx.requireAnyPermission(orgId)` helper.

Permission procedures are a **two-step** pattern: declaring the procedure does not enforce anything by itself — inside the resolver you must `await ctx.requirePermission(input.organizationId)` (it resolves the user's role/custom-role and throws `FORBIDDEN` if the permission is missing). Mirror this on the frontend with the guards/hooks below; never rely on UI hiding alone.

### Early access gate
`createTRPCContext` checks `ALLOW_EARLY_ACCESS`. When enabled, every protected procedure requires the user to have registered an access code, unless their email is in `ADMIN_EMAILS` (see `src/lib/early-access.ts`). Default behavior (flag off) grants access to everyone.

### RBAC (`src/lib/`)
- `rbac.ts` — the `PERMISSIONS` constant (`<module>:<read|write|admin>` strings) and predefined-role permission maps.
- `custom-rbac.ts` — evaluates org-specific custom roles (`hasPermission` / `hasAnyPermission`).
- Frontend enforcement: `ClientPermissionGuard` (`src/components/shared/client-permission-guard.tsx`) plus `usePermissions` / `useModulePermissions` hooks (`src/hooks/`). Convenience wrappers exist per module, e.g. `withClientCRMPermissions(...)`.

### Workflow automation
Domain mutations dispatch events to the workflow engine: see `src/lib/workflow-dispatcher.ts` (`WorkflowEvents.dispatchCrmEvent(...)`) and `src/lib/workflow-engine.ts`, with prebuilt workflows in `src/workflows/prebuilt/`. These dispatches are wrapped in try/catch so a workflow failure never fails the originating mutation — preserve that pattern when adding event sources.

### Routers by module
`src/server/api/routers/` is grouped by domain: `crm/` (contacts, deals, interactions, import), `projects/` (project, task), `finance/` (invoice, expense, expense-categories, financial-reports), `hr/`, `workflows/`, plus `rbac`, `custom-roles`, `invitations`, `templates`, `template-sharing`, `admin`, `early-access`.

## Conventions (from `.cursor/rules/instructions.mdc`)

- **Use `??`, never `||`** for defaulting/null-coalescing.
- **Reuse Prisma-generated types** (`@prisma/client`) and the generated Zod schemas (`prisma/generated/zod`) — do not redefine equivalent types/interfaces. Routers commonly validate input with `z.custom<Prisma.XxxUncheckedCreateInput>()`.
- Client/interactive code lives in `src/components/` with `"use client"`; reserve `page.tsx` for server rendering and data fetching.
- Every page/component must be responsive (mobile-first). Dialogs: `max-h-[90vh] overflow-y-auto`; dialog footers `flex flex-col gap-2 sm:flex-row sm:gap-0`; buttons `w-full sm:w-auto`. Badge text: first letter capital, rest lowercase.
- Validate permissions in **both** the tRPC procedure and the UI for any new feature.

The cursor rules file (`.cursor/rules/instructions.mdc`) is the authoritative, more detailed source for UI and RBAC guidelines.

## Environment
Env vars are validated in `src/env.js` (`@t3-oss/env-nextjs`). Key vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`; optional Twilio (`TWILIO_*`), `ALLOW_EARLY_ACCESS`, `ADMIN_EMAILS`. Set `SKIP_ENV_VALIDATION=true` to bypass validation (used in tests). Copy `.env.example` → `.env` to start.
