import { EmployeesClient } from "~/components/hr/employee/employees-client";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withHRPermissions } from "~/components/shared/permission-guard";

interface EmployeesPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return withHRPermissions(<EmployeesClient />, userRole, orgId);
}
