"use client";

import * as React from "react";
import {
  CreditCard,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  PieChart,
  Settings2,
  Users,
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
} from "~/components/ui/sidebar";

// Sample data for the sidebar
const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/user.jpg",
  },
  teams: [
    {
      name: "OpenSyte Inc",
      logo: PieChart,
      plan: "Enterprise",
    },
  ],
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
      items: [
        {
          title: "Tasks",
          url: "/[orgId]/projects/tasks",
        },
        {
          title: "Kanban Board",
          url: "/[orgId]/projects/kanban",
        },
        {
          title: "Time Tracking",
          url: "/[orgId]/projects/time-tracking",
        },
      ],
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
          url: "/[orgId]/hr/time-off",
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
          title: "Billing",
          url: "/[orgId]/settings/billing",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
