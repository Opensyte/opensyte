import { db } from "~/server/db";
import { InvoiceEditor } from "~/components/finance/invoicing/invoice-editor";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ orgId: string; invoiceId: string }>;
}) {
  const { orgId, invoiceId } = await params;
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  return (
    <FinancePermissionWrapper>
      <InvoiceEditor
        organizationId={orgId}
        organizationName={org?.name ?? "Your Business"}
        invoiceId={invoiceId}
      />
    </FinancePermissionWrapper>
  );
}
