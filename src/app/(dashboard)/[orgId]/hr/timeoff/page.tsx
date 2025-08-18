import { TimeOffClient } from "~/components/hr/timeoff/timeoff-client";

interface TimeOffPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default async function TimeOffPage({ params }: TimeOffPageProps) {
  const { orgId } = await params;
  return (
    <div className="container mx-auto py-6">
      <TimeOffClient organizationId={orgId} />
    </div>
  );
}
