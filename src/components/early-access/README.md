# Early Access System

The Early Access System provides comprehensive route protection and access control for the OpenSyte platform during beta phases.

## Overview

The system consists of three main protection layers:

1. **Middleware Protection** - Server-side route protection at the edge
2. **Server Component Guards** - Server-side component protection
3. **Client Component Guards** - Client-side component protection

## Components

### Middleware (`middleware.ts`)

The Next.js middleware provides the first layer of protection by intercepting requests before they reach your application.

**Features:**

- Protects routes based on `ALLOW_EARLY_ACCESS` environment variable
- Uses cookies for fast validation without database queries
- Redirects unauthorized users to `/early-access` page
- Handles callback URLs for seamless user experience

**Protected Routes:**

- `/dashboard`
- `/admin`
- `/projects`
- `/crm`
- `/finance`
- `/hr`
- `/settings`
- `/workflows`

### ServerEarlyAccessGuard

Server-side component for protecting server components and pages.

```tsx
import { ServerEarlyAccessGuard } from "~/components/early-access";

export default async function ProtectedPage() {
  return (
    <ServerEarlyAccessGuard>
      <div>Protected server-side content</div>
    </ServerEarlyAccessGuard>
  );
}
```

**Features:**

- Performs database validation on the server
- Redirects users without access
- Sets validation cookies for middleware
- No client-side JavaScript required

### EarlyAccessGuard

Client-side component for protecting client components.

```tsx
import { EarlyAccessGuard } from "~/components/early-access";

export function ProtectedComponent() {
  return (
    <EarlyAccessGuard
      fallback={<div>Checking access...</div>}
      redirectTo="/early-access"
    >
      <div>Protected client-side content</div>
    </EarlyAccessGuard>
  );
}
```

**Features:**

- Uses tRPC for access validation
- Customizable loading fallback
- Automatic redirection
- Reactive to access status changes

### withEarlyAccessGuard HOC

Higher-order component for wrapping existing components.

```tsx
import { withEarlyAccessGuard } from "~/components/early-access";

const MyComponent = ({ title }: { title: string }) => <div>{title}</div>;

export const ProtectedComponent = withEarlyAccessGuard(MyComponent, {
  fallback: <div>Loading...</div>,
  redirectTo: "/early-access",
});
```

## Environment Configuration

The system is controlled by environment variables:

```env
# Enable/disable early access protection
ALLOW_EARLY_ACCESS=true

# Admin emails (comma-separated)
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

## Cookie Management

The system uses HTTP-only cookies for middleware validation:

- **Cookie Name:** `early-access-validated`
- **Value:** `"true"` when user has valid access
- **Security:** HTTP-only, secure in production, SameSite=lax
- **Expiration:** 30 days

## Database Integration

The system integrates with the `EarlyAccessCode` model:

```prisma
model EarlyAccessCode {
  id        String   @id @default(cuid())
  email     String   @unique
  code      String   @unique
  isUsed    Boolean  @default(false)
  usedById  String?
  usedAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@index([code])
  @@index([isUsed])
}
```

## API Integration

The system provides tRPC procedures for access management:

### Early Access Router

- `validateCode` - Validate and use a registration code
- `checkAccess` - Check current user's access status
- `getMyStatus` - Get current user's early access details

### Admin Router

- `getEarlyAccessCodes` - List all early access codes
- `addEarlyAccessUser` - Add new early access user
- `resendInvitation` - Resend invitation email

## Usage Patterns

### 1. Protecting Entire Layouts

```tsx
// app/(dashboard)/layout.tsx
import { ServerEarlyAccessGuard } from "~/components/early-access";

export default function DashboardLayout({ children }) {
  return (
    <ServerEarlyAccessGuard>
      <div className="dashboard-layout">{children}</div>
    </ServerEarlyAccessGuard>
  );
}
```

### 2. Protecting Individual Pages

```tsx
// app/protected-page/page.tsx
import { ServerEarlyAccessGuard } from "~/components/early-access";

export default function ProtectedPage() {
  return (
    <ServerEarlyAccessGuard>
      <h1>Protected Page</h1>
    </ServerEarlyAccessGuard>
  );
}
```

### 3. Protecting Client Components

```tsx
// components/protected-feature.tsx
"use client";

import { EarlyAccessGuard } from "~/components/early-access";

export function ProtectedFeature() {
  return (
    <EarlyAccessGuard>
      <div>Beta feature content</div>
    </EarlyAccessGuard>
  );
}
```

### 4. Conditional Rendering

```tsx
"use client";

import { api } from "~/trpc/react";

export function ConditionalFeature() {
  const { data: access } = api.earlyAccess.checkAccess.useQuery();

  if (!access?.hasAccess) {
    return <div>Feature not available</div>;
  }

  return <div>Beta feature content</div>;
}
```

## Error Handling

The system handles various error scenarios:

- **Database errors** - Graceful fallback to access denied
- **Network errors** - Retry mechanisms in client components
- **Cookie issues** - Automatic cookie refresh
- **Session problems** - Redirect to authentication

## Testing

The system includes comprehensive tests:

- Unit tests for utility functions
- Integration tests for API endpoints
- Middleware logic tests
- Component rendering tests

Run tests with:

```bash
bun test src/test/early-access.test.ts
bun test src/test/middleware.test.ts
```

## Security Considerations

- HTTP-only cookies prevent XSS attacks
- Server-side validation prevents client-side bypassing
- Middleware protection at the edge
- Database constraints ensure data integrity
- Admin email validation prevents unauthorized access

## Performance

- Middleware uses cookies for fast validation
- Database queries are optimized with indexes
- Client components use React Query for caching
- Server components perform validation once per request

## Troubleshooting

### Common Issues

1. **Middleware not working**

   - Check `middleware.ts` is in the root directory
   - Verify `config.matcher` is correct
   - Check environment variables are set

2. **Cookie not being set**

   - Verify `setEarlyAccessCookie` is called after code validation
   - Check cookie settings for your environment
   - Ensure HTTPS in production

3. **Infinite redirects**

   - Check public routes are properly excluded
   - Verify early access page is accessible
   - Check callback URL handling

4. **Access denied despite valid code**
   - Check database for code usage status
   - Verify user ID association
   - Clear and regenerate cookies

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=early-access:*
```

This will log middleware decisions and access checks.
