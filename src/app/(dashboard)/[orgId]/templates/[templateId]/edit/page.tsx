import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { TemplateEditClient } from "~/components/templates/template-edit-client";

type TemplateEditPageProps = {
  params: Promise<{
    orgId: string;
    templateId: string;
  }>;
};

export default async function TemplateEditPage({
  params,
}: TemplateEditPageProps) {
  try {
    const { orgId, templateId } = await params;
    // Verify the template exists and user has access
    const template = await api.templates.getDetails({
      templatePackageId: templateId,
    });

    if (!template) {
      notFound();
    }

    return (
      <TemplateEditClient
        organizationId={orgId}
        templateId={templateId}
        template={template}
      />
    );
  } catch {
    notFound();
  }
}
