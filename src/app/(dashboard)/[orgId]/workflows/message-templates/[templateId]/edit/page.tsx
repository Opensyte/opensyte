import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { db } from "~/server/db";
import { MessageTemplateForm } from "~/components/workflows/message-templates/message-template-form";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

export default async function EditMessageTemplatePage({
  params,
}: {
  params: Promise<{ orgId: string; templateId: string }>;
}) {
  const { orgId, templateId } = await params;

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
              Edit Message Template
            </h1>
            <p className="text-muted-foreground">
              Update your email or SMS template
            </p>
          </div>
          <MessageTemplateForm
            organizationId={orgId}
            templateId={templateId}
            mode="edit"
          />
        </div>
      </ClientPermissionGuard>
    </div>
  );
}
