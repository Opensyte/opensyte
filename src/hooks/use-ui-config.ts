"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

export function useUiConfig(
  organizationId: string,
  key: string,
  fallback: Record<string, unknown> = {}
) {
  const { data, isLoading, isError } = api.organization.getUiConfig.useQuery(
    { organizationId, key },
    { enabled: !!organizationId && !!key }
  );

  const config = useMemo(
    () => (data ?? fallback) as Record<string, unknown>,
    [data, fallback]
  );
  return { config, isLoading, isError };
}
