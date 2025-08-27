"use client";

import { RoleManagement } from "~/components/rbac/role-management";
import { useParams } from "next/navigation";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

export default function TeamSettingsPage() {
  const params = useParams();
  const orgId = params?.orgId as string;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Invalid Organization</h2>
          <p className="text-muted-foreground">
            Organization ID is required to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[PERMISSIONS.ORG_MEMBERS, PERMISSIONS.ORG_ADMIN]}
    >
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <RoleManagement organizationId={orgId} />
      </div>
    </ClientPermissionGuard>
  );
}
