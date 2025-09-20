import { ProjectsClient } from "~/components/projects/projects-client";

export default function ProjectsPage({
  params,
}: {
  params: { orgId: string };
}) {
  return <ProjectsClient organizationId={params.orgId} />;
}
