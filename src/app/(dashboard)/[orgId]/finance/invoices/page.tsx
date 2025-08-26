import { InvoiceClient } from "~/components/finance/invoicing/invoice-client";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return (
    <div className="p-4 sm:p-6">
      <InvoiceClient organizationId={orgId} />
    </div>
  );
}
