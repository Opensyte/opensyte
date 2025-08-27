import { PerformanceClient } from "~/components/hr/performance/performance-client";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withHRPermissions } from "~/components/shared/permission-guard";

interface PerformancePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PerformancePage({
  params,
}: PerformancePageProps) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return withHRPermissions(
    <div className="container mx-auto py-6">
      <PerformanceClient organizationId={orgId} />
    </div>,
    userRole,
    orgId
  );
}
