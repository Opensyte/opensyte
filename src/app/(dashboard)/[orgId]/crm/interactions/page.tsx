"use client";

import React from "react";
import { InteractionsClient } from "~/components/crm/interactions/interactions-client";
import { withClientCRMPermissions } from "~/components/shared/client-permission-guard";

interface InteractionsPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default function InteractionsPage({ params }: InteractionsPageProps) {
  const { orgId } = React.use(params);
  return withClientCRMPermissions(
    <InteractionsClient organizationId={orgId} />
  );
}
