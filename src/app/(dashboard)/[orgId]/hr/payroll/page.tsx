import { PayrollClient } from "~/components/hr/payroll/payroll-client";
import { HRPermissionWrapper } from "~/components/shared/wrappers/hr-permission-wrapper";

interface PayrollPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PayrollPage({ params }: PayrollPageProps) {
  await params; // Consume the params promise for SSR compatibility

  return (
    <HRPermissionWrapper>
      <PayrollClient />
    </HRPermissionWrapper>
  );
}
