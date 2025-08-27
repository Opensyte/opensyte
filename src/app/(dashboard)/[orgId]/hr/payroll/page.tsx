import { PayrollClient } from "~/components/hr/payroll/payroll-client";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withHRPermissions } from "~/components/shared/permission-guard";

interface PayrollPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PayrollPage({ params }: PayrollPageProps) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return withHRPermissions(<PayrollClient />, userRole, orgId);
}
