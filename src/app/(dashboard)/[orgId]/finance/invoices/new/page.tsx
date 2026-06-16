import { db } from "~/server/db";
import { InvoiceEditor } from "~/components/finance/invoicing/invoice-editor";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  return (
    <FinancePermissionWrapper>
      <InvoiceEditor
        organizationId={orgId}
        organizationName={org?.name ?? "Your Business"}
      />
    </FinancePermissionWrapper>
  );
}
