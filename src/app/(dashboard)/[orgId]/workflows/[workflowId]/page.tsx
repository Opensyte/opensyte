import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export default async function DeprecatedWorkflowDesignerPage({
  params,
}: {
  params: { orgId: string; workflowId: string };
}) {
  const { orgId } = params;

  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const organization = await db.organization.findFirst({
    where: {
      id: orgId,
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: { id: true },
  });

  if (!organization) {
    redirect("/");
  }

  redirect(`/${orgId}/workflows`);
}
