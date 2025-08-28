import { InvoiceClient } from "~/components/finance/invoicing/invoice-client";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <FinancePermissionWrapper>
      <div className="p-4 sm:p-6">
        <InvoiceClient organizationId={orgId} />
      </div>
    </FinancePermissionWrapper>
  );
}
