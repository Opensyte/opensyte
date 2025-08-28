import { PerformanceClient } from "~/components/hr/performance/performance-client";
import { HRPermissionWrapper } from "~/components/shared/wrappers/hr-permission-wrapper";

interface PerformancePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PerformancePage({
  params,
}: PerformancePageProps) {
  const { orgId } = await params;

  return (
    <HRPermissionWrapper>
      <div className="container mx-auto py-6">
        <PerformanceClient organizationId={orgId} />
      </div>
    </HRPermissionWrapper>
  );
}
