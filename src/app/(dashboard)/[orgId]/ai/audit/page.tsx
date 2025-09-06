import { AuditDashboard } from "~/components/ai";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.AI_READ,
        PERMISSIONS.AI_WRITE,
        PERMISSIONS.AI_ADMIN,
      ]}
    >
      <div className="p-4 sm:p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Engine</h1>
            <p className="text-muted-foreground">
              Comprehensive financial audit analysis and reporting
            </p>
          </div>

          <AuditDashboard
            organizationId={orgId}
            documents={[]} // Would come from tRPC query
            isLoading={false}
            className="w-full"
          />
        </div>
      </div>
    </ClientPermissionGuard>
  );
}
