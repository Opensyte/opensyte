import { ExpenseClient } from "~/components/finance/expenses/expense-client";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <FinancePermissionWrapper>
      <div className="p-4 sm:p-6">
        <ExpenseClient organizationId={orgId} />
      </div>
    </FinancePermissionWrapper>
  );
}
