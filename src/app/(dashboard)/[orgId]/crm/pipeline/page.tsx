import { Pipeline } from "~/components/crm/pipeline/pipeline";
import { AddDealDialog } from "~/components/crm/pipeline/add-deal-dialog";

interface PipelinePageProps {
  params: Promise<{ orgId: string }>;
}

export default async function PipelinePage({ params }: PipelinePageProps) {
  const { orgId } = await params;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your sales opportunities
          </p>
        </div>
        <AddDealDialog organizationId={orgId} />
      </div>
      <Pipeline organizationId={orgId} />
    </div>
  );
}
