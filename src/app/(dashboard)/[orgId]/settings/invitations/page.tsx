import { InvitationPageClient } from "~/components/settings/invitations/invitation-page-client";
import { SettingsPermissionWrapper } from "~/components/shared/wrappers/settings-permission-wrapper";

interface InvitationsPageProps {
  params: Promise<{ orgId: string }>;
}

export default async function InvitationsPage({
  params,
}: InvitationsPageProps) {
  await params; // Consume the params promise for SSR compatibility

  return (
    <SettingsPermissionWrapper>
      <InvitationPageClient />
    </SettingsPermissionWrapper>
  );
}
