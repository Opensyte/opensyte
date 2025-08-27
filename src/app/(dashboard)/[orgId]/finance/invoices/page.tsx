import { InvoiceClient } from "~/components/finance/invoicing/invoice-client";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withFinancePermissions } from "~/components/shared/permission-guard";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return withFinancePermissions(
    <div className="p-4 sm:p-6">
      <InvoiceClient organizationId={orgId} />
    </div>,
    userRole,
    orgId
  );
}
