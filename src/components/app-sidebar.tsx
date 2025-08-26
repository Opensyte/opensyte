"use client";

import * as React from "react";
import {
  CreditCard,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Settings2,
  Users,
  Building2,
  Plus,
  Folder,
} from "lucide-react";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import { TeamSwitcher } from "~/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProjectCreateDialog } from "~/components/projects/project-create-dialog";

// Sample data for the sidebar
const getNavData = (setIsCreateProjectDialogOpen: (open: boolean) => void) => ({
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "CRM",
      url: "/[orgId]/crm",
      icon: Users,
      items: [
        {
          title: "Contacts",
          url: "/[orgId]/crm/contacts",
        },
        {
          title: "Interactions",
          url: "/[orgId]/crm/interactions",
        },
        {
          title: "Sales Pipeline",
          url: "/[orgId]/crm/pipeline",
        },
      ],
    },
    {
      title: "Projects",
      url: "/[orgId]/projects",
      icon: FileSpreadsheet,
      action: {
        icon: Plus,
        onClick: () => setIsCreateProjectDialogOpen(true),
        tooltip: "Create new project",
      },
      items: [],
    },
    {
      title: "Finance",
      url: "/[orgId]/finance",
      icon: CreditCard,
      items: [
        {
          title: "Invoices",
          url: "/[orgId]/finance/invoices",
        },
        {
          title: "Expenses",
          url: "/[orgId]/finance/expenses",
        },
        {
          title: "Reports",
          url: "/[orgId]/finance/reports",
        },
      ],
    },
    {
      title: "Collaboration",
      url: "/[orgId]/collaboration",
      icon: MessageSquare,
      items: [
        {
          title: "Chat",
          url: "/[orgId]/chat",
        },
        {
          title: "Calendar",
          url: "/[orgId]/calendar",
        },
        {
          title: "Documents",
          url: "/[orgId]/collaboration/documents",
        },
      ],
    },
    {
      title: "HR",
      url: "/[orgId]/hr",
      icon: Users,
      items: [
        {
          title: "Employees",
          url: "/[orgId]/hr/employees",
        },
        {
          title: "Payroll",
          url: "/[orgId]/hr/payroll",
        },
        {
          title: "Time Off",
          url: "/[orgId]/hr/timeoff",
        },
        {
          title: "Performance",
          url: "/[orgId]/hr/performance",
        },
      ],
    },
    {
      title: "Marketing",
      url: "/[orgId]/marketing",
      icon: Mail,
      items: [
        {
          title: "Campaigns",
          url: "/[orgId]/marketing/campaigns",
        },
        {
          title: "Social Media",
          url: "/[orgId]/marketing/social",
        },
        {
          title: "Analytics",
          url: "/[orgId]/marketing/analytics",
        },
      ],
    },
    {
      title: "Settings",
      url: "/[orgId]/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/[orgId]/settings/general",
        },
        {
          title: "Team",
          url: "/[orgId]/settings/team",
        },
        {
          title: "Invitations",
          url: "/[orgId]/settings/invitations",
        },
        {
          title: "Billing",
          url: "/[orgId]/settings/billing",
        },
      ],
    },
  ],
});

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = authClient.useSession();
  const params = useParams();
  const orgId = params?.orgId as string;
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] =
    useState(false);

  const { data: organizations, isLoading } = api.organization.getAll.useQuery(
    { userId: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id }
  );

  // Get navigation data with the state setter
  const data = getNavData(setIsCreateProjectDialogOpen);

  // Fetch projects for the current organization
  const { data: projects } = api.project.getAll.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  // Transform organizations to teams format for TeamSwitcher
  const teams = React.useMemo(() => {
    if (!organizations) return [];

    return organizations.map(org => ({
      id: org.id,
      name: org.name,
      logo: Building2, // Using Building2 as default icon for all orgs
      plan: org.userRole, // Using user role as plan
    }));
  }, [organizations]);

  // Create dynamic navigation with projects
  const dynamicNavMain = React.useMemo(() => {
    const baseNav = [...data.navMain];

    // Find the Projects section and update it with dynamic project items
    const projectsIndex = baseNav.findIndex(item => item.title === "Projects");
    if (projectsIndex !== -1 && projects) {
      const projectItems = projects.map(project => ({
        title: project.name,
        url: `/[orgId]/projects/${project.id}`,
        icon: Folder,
      }));

      const currentProjectSection = baseNav[projectsIndex]!;
      // Type-safe way to update the items
      baseNav[projectsIndex] = {
        ...currentProjectSection,
        items: projectItems,
      } as typeof currentProjectSection; // Ensure type compatibility
    }

    return baseNav;
  }, [projects, data.navMain]);

  // Show loading state
  if (isLoading || !session?.user?.id) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={dynamicNavMain} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
        <SidebarRail />

        {/* Project Creation Dialog */}
        {orgId && (
          <ProjectCreateDialog
            open={isCreateProjectDialogOpen}
            onOpenChange={setIsCreateProjectDialogOpen}
            organizationId={orgId}
          />
        )}
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={dynamicNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />

      {/* Project Creation Dialog */}
      {orgId && (
        <ProjectCreateDialog
          open={isCreateProjectDialogOpen}
          onOpenChange={setIsCreateProjectDialogOpen}
          organizationId={orgId}
        />
      )}
    </Sidebar>
  );
}
