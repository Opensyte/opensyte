import { Plus } from "lucide-react";
import { Pipeline } from "~/components/crm/pipeline/pipeline";
import { Button } from "~/components/ui/button";

export default function PipelinePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your sales opportunities
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add New Deal
        </Button>
      </div>
      <Pipeline />
    </div>
  );
}
