"use client";

import React from "react";
import { InteractionsClient } from "~/components/crm/interactions/interactions-client";

// TODO: Adding edit functionality for interactions feature

interface InteractionsPageProps {
  params: Promise<{
    orgId: string;
  }>;
}

export default function InteractionsPage({ params }: InteractionsPageProps) {
  const { orgId } = React.use(params);
  return <InteractionsClient organizationId={orgId} />;
}
