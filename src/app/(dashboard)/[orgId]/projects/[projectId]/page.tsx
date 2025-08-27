import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ProjectTasksClient } from "~/components/projects/project-tasks-client";
import { ProjectTasksSkeleton } from "~/components/projects/project-tasks-skeleton";
import { api } from "~/trpc/server";
import { getUserOrganizationRole } from "~/lib/server-auth-utils";
import { withProjectPermissions } from "~/components/shared/permission-guard";

interface ProjectPageProps {
  params: Promise<{
    orgId: string;
    projectId: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { orgId, projectId } = await params;
  const userRole = await getUserOrganizationRole(orgId);

  try {
    // Just verify project exists and belongs to the organization
    const project = await api.project.getById({
      id: projectId,
      organizationId: orgId,
    });

    if (!project) {
      redirect(`/${orgId}/projects`);
    }
  } catch {
    // If verification fails, redirect to dashboard
    redirect(`/${orgId}`);
  }

  return withProjectPermissions(
    <div className="flex h-full flex-col">
      <Suspense fallback={<ProjectTasksSkeleton />}>
        <ProjectTasksClient organizationId={orgId} projectId={projectId} />
      </Suspense>
    </div>,
    userRole,
    orgId
  );
}
