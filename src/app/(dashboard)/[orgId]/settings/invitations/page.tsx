import { InvitationPageClient } from "~/components/settings/invitations/invitation-page-client";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { PermissionGuard } from "~/components/shared/permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface InvitationsPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function InvitationsPage({
  params,
}: InvitationsPageProps) {
  const { orgId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  return (
    <PermissionGuard
      userRole={userRole}
      requiredAnyPermissions={[PERMISSIONS.ORG_MEMBERS, PERMISSIONS.ORG_ADMIN]}
      organizationId={orgId}
    >
      <InvitationPageClient />
    </PermissionGuard>
  );
}
