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
  NavMainSkeleton,
  TeamSwitcherSkeleton,
  NavUserSkeleton,
} from "~/components/ui/sidebar-skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProjectCreateDialog } from "~/components/projects/project-create-dialog";
import { getRoleDisplayName } from "~/lib/rbac";

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

  // Get user permissions for the current organization
  const { data: userPermissions } = api.rbac.getUserPermissions.useQuery(
    {
      userId: session?.user?.id ?? "",
      organizationId: orgId,
    },
    { enabled: !!session?.user?.id && !!orgId }
  );

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
      plan: getRoleDisplayName(org.userRole), // Convert role enum to display name
    }));
  }, [organizations]);

  // Create navigation data based on user permissions
  const getNavData = React.useCallback(() => {
    if (!userPermissions?.permissions) {
      return [];
    }

    const permissions = userPermissions.permissions;
    const navItems = [];

    // CRM Module
    if (permissions.canViewCRM) {
      navItems.push({
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
      });
    }

    // Projects Module
    if (permissions.canViewProjects) {
      navItems.push({
        title: "Projects",
        url: "/[orgId]/projects",
        icon: FileSpreadsheet,
        action: permissions.canWriteProjects
          ? {
              icon: Plus,
              onClick: () => setIsCreateProjectDialogOpen(true),
              tooltip: "Create new project",
            }
          : undefined,
        items: [],
      });
    }

    // Finance Module
    if (permissions.canViewFinance) {
      navItems.push({
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
      });
    }

    // Collaboration Module
    if (permissions.canViewCollaboration) {
      navItems.push({
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
      });
    }

    // HR Module
    if (permissions.canViewHR) {
      navItems.push({
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
      });
    }

    // Marketing Module
    if (permissions.canViewMarketing) {
      navItems.push({
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
      });
    }

    // Settings Module - always show but with different items based on permissions
    if (permissions.canViewSettings) {
      const settingsItems = [
        {
          title: "General",
          url: "/[orgId]/settings/general",
        },
      ];

      if (permissions.canManageMembers) {
        settingsItems.push({
          title: "Team Management",
          url: "/[orgId]/settings/teams",
        });
        settingsItems.push({
          title: "Invitations",
          url: "/[orgId]/settings/invitations",
        });
      }

      if (permissions.canManageBilling) {
        settingsItems.push({
          title: "Billing",
          url: "/[orgId]/settings/billing",
        });
      }

      navItems.push({
        title: "Settings",
        url: "/[orgId]/settings",
        icon: Settings2,
        items: settingsItems,
      });
    }

    return navItems;
  }, [userPermissions?.permissions]);

  // Create dynamic navigation with projects
  const dynamicNavMain = React.useMemo(() => {
    const baseNav = getNavData();

    // Find the Projects section and update it with dynamic project items
    const projectsIndex = baseNav.findIndex(item => item.title === "Projects");
    if (projectsIndex !== -1 && projects) {
      const projectItems = projects.map(project => ({
        title: project.name,
        url: `/[orgId]/projects/${project.id}`,
        icon: Folder,
      }));

      const currentProjectSection = baseNav[projectsIndex]!;
      baseNav[projectsIndex] = {
        ...currentProjectSection,
        items: projectItems,
      } as typeof currentProjectSection;
    }

    return baseNav;
  }, [getNavData, projects]);

  // Show loading state
  if (isLoading || !session?.user?.id) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcherSkeleton />
        </SidebarHeader>
        <SidebarContent>
          <NavMainSkeleton />
        </SidebarContent>
        <SidebarFooter>
          <NavUserSkeleton />
        </SidebarFooter>
        <SidebarRail />
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
        <NavUser
          user={{
            name: session.user.name ?? "User",
            email: session.user.email ?? "user@example.com",
            avatar: session.user.image ?? "/avatars/user.jpg",
          }}
        />
      </SidebarFooter>
      <SidebarRail />

      {/* Project Creation Dialog */}
      {orgId && userPermissions?.permissions.canWriteProjects && (
        <ProjectCreateDialog
          open={isCreateProjectDialogOpen}
          onOpenChange={setIsCreateProjectDialogOpen}
          organizationId={orgId}
        />
      )}
    </Sidebar>
  );
}
