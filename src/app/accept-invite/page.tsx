import AcceptInvitationClient from "~/components/invitations/accept-invitation-form";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AcceptInvitationClient token={token} />;
}
