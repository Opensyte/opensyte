import { PersonalizedViews } from "~/components/ai";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

export default async function PersonalizedViewsPage({
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
        <PersonalizedViews
          organizationId={orgId}
          userId="user-1" // Would come from session
          role="founder" // Would come from user role
          generatedViews={[]}
          isLoading={false}
          className="w-full"
        />
      </div>
    </ClientPermissionGuard>
  );
}
