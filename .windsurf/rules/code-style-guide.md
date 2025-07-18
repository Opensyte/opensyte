---
trigger: always_on
---

# Coding Standards & Guidelines

## General Rules
- Use the components folder for anything related to UI or client components
- Use only page.tsx files for server-side rendering (SSR)
- Always fix ESLint and TypeScript type errors before committing
- When using JSON sample data for testing, ensure it conforms to the Prisma schema
- every page you create make it responsive

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

## Performance
- Use proper code splitting and lazy loading
- Optimize images with Next.js Image component
- Implement proper caching strategies
- Minimize client-side JavaScript