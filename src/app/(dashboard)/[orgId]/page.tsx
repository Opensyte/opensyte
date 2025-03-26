import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  console.log({ orgId });
  redirect(`${orgId}/crm/contacts`);
}
