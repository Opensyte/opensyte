import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { db } from "~/server/db";
import { MessageTemplateForm } from "~/components/workflows/message-templates/message-template-form";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

export default async function CreateMessageTemplatePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  // Get user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Check if organization exists and user has access
  const organization = await db.organization.findFirst({
    where: {
      id: orgId,
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!organization) {
    redirect("/");
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <ClientPermissionGuard
        requiredAnyPermissions={[
          PERMISSIONS.WORKFLOWS_WRITE,
          PERMISSIONS.TEMPLATES_WRITE,
        ]}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Create Message Template
            </h1>
            <p className="text-muted-foreground">
              Create a new email or SMS template for your workflows
            </p>
          </div>
          <MessageTemplateForm organizationId={orgId} mode="create" />
        </div>
      </ClientPermissionGuard>
    </div>
  );
}
