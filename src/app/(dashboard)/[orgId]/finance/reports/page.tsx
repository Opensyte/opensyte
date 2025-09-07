import { FinancialReportsClient } from "~/components/finance/reports/financial-reports-client";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

/**
 * Server component that renders the finance reports UI for a given organization.
 *
 * Awaits route `params` to extract `orgId`, wraps the page in finance permission checks,
 * and mounts the client-side `FinancialReportsClient` with the resolved `organizationId`.
 *
 * @param params - A promise resolving to an object containing the route `orgId`.
 * @returns A React element for the organization's financial reports page.
 */
export default async function FinancialReportsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <FinancePermissionWrapper>
      <div className="p-4 sm:p-6">
        <FinancialReportsClient organizationId={orgId} />
      </div>
    </FinancePermissionWrapper>
  );
}
