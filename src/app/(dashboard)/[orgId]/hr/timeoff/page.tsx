import { TimeOffClient } from "~/components/hr/timeoff/timeoff-client";

interface TimeOffPageProps {
  params: {
    orgId: string;
  };
}

export default function TimeOffPage({ params }: TimeOffPageProps) {
  return (
    <div className="container mx-auto py-6">
      <TimeOffClient organizationId={params.orgId} />
    </div>
  );
}
