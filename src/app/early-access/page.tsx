import { redirect } from "next/navigation";
import { AccessDeniedPage } from "~/components/early-access";
import { checkUserEarlyAccess } from "~/lib/early-access";

interface EarlyAccessPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function EarlyAccessPage({
  searchParams,
}: EarlyAccessPageProps) {
  const { callbackUrl } = await searchParams;

  // Check early access status
  const accessStatus = await checkUserEarlyAccess();

  // If user has access, redirect to callback URL or dashboard
  if (accessStatus.hasAccess) {
    redirect(callbackUrl ?? "/dashboard");
  }

  // Determine the reason for access denial
  const reason = accessStatus.reason as "not_authenticated" | "no_valid_code";

  return (
    <AccessDeniedPage
      reason={reason}
      userEmail={accessStatus.user?.email ?? undefined}
      callbackUrl={callbackUrl}
    />
  );
}
