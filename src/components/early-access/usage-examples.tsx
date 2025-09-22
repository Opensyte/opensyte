/**
 * This file contains usage examples for the Early Access Guard components.
 * These examples show how to protect components and pages with early access validation.
 */

import {
  EarlyAccessGuard,
  withEarlyAccessGuard,
  ServerEarlyAccessGuard,
} from "./index";

// Example 1: Using EarlyAccessGuard component directly
export function ProtectedComponent() {
  return (
    <EarlyAccessGuard>
      <div>
        <h1>Protected Content</h1>
        <p>This content is only visible to users with valid early access.</p>
      </div>
    </EarlyAccessGuard>
  );
}

// Example 2: Using EarlyAccessGuard with custom fallback
export function ProtectedComponentWithFallback() {
  return (
    <EarlyAccessGuard
      fallback={
        <div className="p-4 text-center">
          <p>Checking your early access status...</p>
        </div>
      }
      redirectTo="/early-access"
    >
      <div>
        <h1>Protected Content</h1>
        <p>This content has a custom loading fallback.</p>
      </div>
    </EarlyAccessGuard>
  );
}

// Example 3: Using Higher-Order Component
const MyProtectedComponent = ({ title }: { title: string }) => (
  <div>
    <h1>{title}</h1>
    <p>This component is wrapped with the HOC.</p>
  </div>
);

export const ProtectedWithHOC = withEarlyAccessGuard(MyProtectedComponent, {
  fallback: <div>Loading protected content...</div>,
  redirectTo: "/early-access",
});

// Example 4: Server-side protection (for use in server components)
export async function ServerProtectedComponent() {
  return (
    <ServerEarlyAccessGuard>
      <div>
        <h1>Server-Side Protected Content</h1>
        <p>This content is protected at the server level.</p>
      </div>
    </ServerEarlyAccessGuard>
  );
}

// Example 5: Conditional rendering based on early access status
import { api } from "~/trpc/react";

export function ConditionalContent() {
  const { data: accessStatus } = api.earlyAccess.checkAccess.useQuery();

  if (!accessStatus?.hasAccess) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p>You need early access to view this content.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Early Access Content</h1>
      <p>Welcome to the beta! You have access to all features.</p>
    </div>
  );
}
