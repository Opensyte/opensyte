import { TimeOffClient } from "~/components/hr/timeoff/timeoff-client";
import { HRPermissionWrapper } from "~/components/shared/wrappers/hr-permission-wrapper";

interface TimeOffPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function TimeOffPage({ params }: TimeOffPageProps) {
  const { orgId } = await params;

  return (
    <HRPermissionWrapper>
      <div className="container mx-auto py-6">
        <TimeOffClient organizationId={orgId} />
      </div>
    </HRPermissionWrapper>
  );
}
