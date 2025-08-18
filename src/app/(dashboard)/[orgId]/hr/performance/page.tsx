import { PerformanceClient } from "~/components/hr/performance/performance-client";

interface PerformancePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PerformancePage({
  params,
}: PerformancePageProps) {
  const { orgId } = await params;
  return (
    <div className="container mx-auto py-6">
      <PerformanceClient organizationId={orgId} />
    </div>
  );
}
