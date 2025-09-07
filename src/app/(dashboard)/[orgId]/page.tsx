import { redirect } from "next/navigation";
import { getFirstAuthorizedModulePath } from "~/lib/server-auth-utils";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Get the first authorized module path for the user
  const modulePath = await getFirstAuthorizedModulePath(orgId);

  redirect(`${orgId}/${modulePath}`);
}
