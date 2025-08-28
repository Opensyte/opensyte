import { Pipeline } from "~/components/crm/pipeline/pipeline";
import { AddDealDialog } from "~/components/crm/pipeline/add-deal-dialog";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { CRMPermissionWrapper } from "~/components/shared/wrappers/crm-permission-wrapper";

interface PipelinePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PipelinePage({ params }: PipelinePageProps) {
  const { orgId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? "";

  return (
    <CRMPermissionWrapper>
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Sales Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your sales opportunities
            </p>
          </div>
          {userId && <AddDealDialog organizationId={orgId} userId={userId} />}
        </div>
        <Pipeline organizationId={orgId} />
      </div>
    </CRMPermissionWrapper>
  );
}
