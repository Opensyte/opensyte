"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Loader2 } from "lucide-react";

interface EarlyAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Client-side component that protects content based on early access validation
 * This is useful for protecting specific components or pages that need early access
 */
export function EarlyAccessGuard({
  children,
  fallback,
  redirectTo = "/early-access",
}: EarlyAccessGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  const { data: accessStatus, isLoading } =
    api.earlyAccess.checkAccess.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);

      if (!accessStatus?.hasAccess) {
        router.push(redirectTo);
      }
    }
  }, [accessStatus, isLoading, router, redirectTo]);

  // Show loading state while checking access
  if (isChecking || isLoading) {
    return (
      fallback ?? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking access...</span>
          </div>
        </div>
      )
    );
  }

  // If user doesn't have access, don't render children (they'll be redirected)
  if (!accessStatus?.hasAccess) {
    return null;
  }

  // User has access, render the protected content
  return <>{children}</>;
}

/**
 * Higher-Order Component version of EarlyAccessGuard
 * Wraps a component to require early access validation
 */
export function withEarlyAccessGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode;
    redirectTo?: string;
  }
) {
  const WrappedComponent = (props: P) => {
    return (
      <EarlyAccessGuard
        fallback={options?.fallback}
        redirectTo={options?.redirectTo}
      >
        <Component {...props} />
      </EarlyAccessGuard>
    );
  };

  WrappedComponent.displayName = `withEarlyAccessGuard(${
    Component.displayName ?? Component.name
  })`;

  return WrappedComponent;
}
