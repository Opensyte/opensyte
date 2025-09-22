import { redirect } from "next/navigation";
import { checkUserEarlyAccess } from "~/lib/early-access";

interface ServerEarlyAccessGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Server-side component that protects content based on early access validation
 * This should be used in server components and pages
 */
export async function ServerEarlyAccessGuard({
  children,
  redirectTo = "/early-access",
}: ServerEarlyAccessGuardProps) {
  const accessStatus = await checkUserEarlyAccess();

  // If user doesn't have access, redirect them
  if (!accessStatus.hasAccess) {
    redirect(redirectTo);
  }

  // User has access, render the protected content
  return <>{children}</>;
}

/**
 * Utility function to check early access in server components
 * Returns the access status without redirecting
 */
export async function checkEarlyAccessStatus() {
  return await checkUserEarlyAccess();
}
