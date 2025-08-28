import { EmployeesClient } from "~/components/hr/employee/employees-client";
import { HRPermissionWrapper } from "~/components/shared/wrappers/hr-permission-wrapper";

interface EmployeesPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
  await params; // Consume the params promise for SSR compatibility

  return (
    <HRPermissionWrapper>
      <EmployeesClient />
    </HRPermissionWrapper>
  );
}
