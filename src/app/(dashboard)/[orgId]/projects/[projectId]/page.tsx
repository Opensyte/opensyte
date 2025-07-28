import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProjectTasksClient } from "~/components/projects/project-tasks-client";
import { ProjectTasksSkeleton } from "~/components/projects/project-tasks-skeleton";
import { api } from "~/trpc/server";

interface ProjectPageProps {
  params: {
    orgId: string;
    projectId: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    // Just verify project exists and belongs to the organization
    const project = await api.project.getById({ 
      id: params.projectId,
      organizationId: params.orgId
    });
    
    if (!project) {
      redirect(`/${params.orgId}/projects`);
    }
  } catch {
    // If verification fails, redirect to dashboard
    redirect(`/${params.orgId}`);
  }

  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<ProjectTasksSkeleton />}>
        <ProjectTasksClient 
          organizationId={params.orgId}
          projectId={params.projectId}
        />
      </Suspense>
    </div>
  );
}
