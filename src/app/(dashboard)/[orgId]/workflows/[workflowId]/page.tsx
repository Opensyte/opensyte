import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { db } from "~/server/db";
import { WorkflowDesigner } from "~/components/workflow/workflow-designer";
import { Skeleton } from "~/components/ui/skeleton";
import { Suspense } from "react";

function WorkflowDesignerSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="h-[calc(100vh-12rem)] border rounded-lg">
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 h-full">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="col-span-2 border rounded">
              <div className="p-4 space-y-4">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-32" />
                  <Skeleton className="h-16 w-32" />
                </div>
                <Skeleton className="h-48 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function WorkflowDesignerPage({
  params,
}: {
  params: Promise<{ orgId: string; workflowId: string }>;
}) {
  const { orgId, workflowId } = await params;

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Workflow Designer
          </h2>
          <p className="text-muted-foreground">
            Design and configure your automated workflows
          </p>
        </div>
        <a
          href={`/${orgId}/workflows`}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Back to Workflows
        </a>
      </div>
      <div className="h-[calc(100vh-12rem)]">
        <Suspense fallback={<WorkflowDesignerSkeleton />}>
          <WorkflowDesigner organizationId={orgId} workflowId={workflowId} />
        </Suspense>
      </div>
    </div>
  );
}
