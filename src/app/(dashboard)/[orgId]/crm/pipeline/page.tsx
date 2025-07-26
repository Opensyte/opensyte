import { Pipeline } from "~/components/crm/pipeline/pipeline";
import { AddDealDialog } from "~/components/crm/pipeline/add-deal-dialog";

interface PipelinePageProps {
  params: { orgId: string };
}

export default function PipelinePage({ params }: PipelinePageProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your sales opportunities
          </p>
        </div>
        <AddDealDialog organizationId={params.orgId} />
      </div>
      <Pipeline organizationId={params.orgId} />
    </div>
  );
}
