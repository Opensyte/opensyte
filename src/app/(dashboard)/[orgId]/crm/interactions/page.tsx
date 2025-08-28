import React from "react";
import { InteractionsClient } from "~/components/crm/interactions/interactions-client";
import { CRMPermissionWrapper } from "~/components/shared/wrappers/crm-permission-wrapper";

interface InteractionsPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default function InteractionsPage({ params }: InteractionsPageProps) {
  const { orgId } = React.use(params);
  return (
    <CRMPermissionWrapper>
      <InteractionsClient organizationId={orgId} />
    </CRMPermissionWrapper>
  );
}
