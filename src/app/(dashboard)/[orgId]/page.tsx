import { redirect } from "next/navigation";
import { getFirstAuthorizedModulePath } from "~/lib/server-auth-utils";

/**
 * Redirects to the organization's first authorized module route.
 *
 * Awaits the provided route params to obtain `orgId`, resolves the first module
 * path the current user is authorized to access for that organization, then
 * performs a server-side redirect to `${orgId}/${modulePath}`.
 *
 * @param params - A promise that resolves to an object containing `orgId`.
 */
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
