import { FileText } from "lucide-react";
import { InvoiceSettingsForm } from "~/components/finance/invoicing/invoice-settings-form";
import { FinancePermissionWrapper } from "~/components/shared/wrappers/finance-permission-wrapper";

export default async function InvoicingSettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <FinancePermissionWrapper>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoicing</h1>
            <p className="text-muted-foreground">
              Business details, defaults, numbering, and email templates
            </p>
          </div>
        </div>
        <InvoiceSettingsForm organizationId={orgId} />
      </div>
    </FinancePermissionWrapper>
  );
}
