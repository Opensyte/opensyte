"use client";

import * as React from "react";
import {
  BarChart3,
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
      url: "/crm",
      icon: Users,
      items: [
        {
          title: "Contacts",
          url: "/crm/contacts",
        },
        {
          title: "Leads",
          url: "/crm/leads",
        },
        {
          title: "Sales Pipeline",
          url: "/crm/pipeline",
        },
      ],
    },
    {
      title: "Projects",
      url: "/projects",
      icon: FileSpreadsheet,
      items: [
        {
          title: "Tasks",
          url: "/projects/tasks",
        },
        {
          title: "Kanban Board",
          url: "/projects/kanban",
        },
        {
          title: "Time Tracking",
          url: "/projects/time-tracking",
        },
      ],
    },
    {
      title: "Finance",
      url: "/finance",
      icon: CreditCard,
      items: [
        {
          title: "Invoices",
          url: "/finance/invoices",
        },
        {
          title: "Expenses",
          url: "/finance/expenses",
        },
        {
          title: "Reports",
          url: "/finance/reports",
        },
      ],
    },
    {
      title: "Collaboration",
      url: "/collaboration",
      icon: MessageSquare,
      items: [
        {
          title: "Chat",
          url: "/chat",
        },
        {
          title: "Calendar",
          url: "/calendar",
        },
        {
          title: "Documents",
          url: "/collaboration/documents",
        },
      ],
    },
    {
      title: "HR",
      url: "/hr",
      icon: Users,
      items: [
        {
          title: "Employees",
          url: "/hr/employees",
        },
        {
          title: "Payroll",
          url: "/hr/payroll",
        },
        {
          title: "Time Off",
          url: "/hr/time-off",
        },
      ],
    },
    {
      title: "Marketing",
      url: "/marketing",
      icon: Mail,
      items: [
        {
          title: "Campaigns",
          url: "/marketing/campaigns",
        },
        {
          title: "Social Media",
          url: "/marketing/social",
        },
        {
          title: "Analytics",
          url: "/marketing/analytics",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/settings/general",
        },
        {
          title: "Team",
          url: "/settings/team",
        },
        {
          title: "Billing",
          url: "/settings/billing",
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
