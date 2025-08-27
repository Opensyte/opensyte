import { TimeOffClient } from "~/components/hr/timeoff/timeoff-client";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withHRPermissions } from "~/components/shared/permission-guard";

interface TimeOffPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function TimeOffPage({ params }: TimeOffPageProps) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return withHRPermissions(
    <div className="container mx-auto py-6">
      <TimeOffClient organizationId={orgId} />
    </div>,
    userRole,
    orgId
  );
}
