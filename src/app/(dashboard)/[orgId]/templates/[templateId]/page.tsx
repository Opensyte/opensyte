import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { TemplateViewClient } from "~/components/templates/template-view-client";

type TemplateViewPageProps = {
  params: Promise<{
    orgId: string;
    templateId: string;
  }>;
};

export default async function TemplateViewPage({
  params,
}: TemplateViewPageProps) {
  try {
    const { orgId, templateId } = await params;
    // Verify the template exists
    const template = await api.templates.getDetails({
      templatePackageId: templateId,
    });

    if (!template) {
      notFound();
    }

    return (
      <TemplateViewClient organizationId={orgId} templateId={templateId} />
    );
  } catch {
    notFound();
  }
}
