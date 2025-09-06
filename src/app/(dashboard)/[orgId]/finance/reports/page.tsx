import { FinancialReportsClient } from "~/components/finance/reports/financial-reports-client";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

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
