"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { AddOrganizationDialog } from "~/components/organizations/add-organization-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import type { OrganizationFormValues } from "~/components/organizations/add-organization-dialog";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    id: string;
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const { data: session } = authClient.useSession();

  const utils = api.useUtils();

  const createOrganizationMutation = api.organization.create.useMutation({
    onSuccess: newOrg => {
      void utils.organization.getAll.invalidate();
      toast.success("Organization created successfully!");
      setIsAddDialogOpen(false);
      // Navigate to the new organization
      router.push(`/${newOrg.id}`);
    },
    onError: error => {
      toast.error(error.message || "Failed to create organization");
    },
  });

  // Extract current organization ID from pathname
  const currentOrgId = pathname.split("/")[1];

  // Find the current active team based on the URL
  const activeTeam = teams.find(team => team.id === currentOrgId) ?? teams[0];

  const handleAddOrganization = async (data: OrganizationFormValues) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to create an organization");
      return;
    }

    await createOrganizationMutation.mutateAsync({
      ...data,
      userId: session.user.id,
    });
  };

  const handleTeamSwitch = (team: (typeof teams)[0]) => {
    // Navigate to the selected organization
    router.push(`/${team.id}`);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddDialogOpen(true);
  };

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeTeam.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {teams.map(team => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleTeamSwitch(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <team.logo className="size-3.5 shrink-0" />
                </div>
                {team.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleAddClick}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">
                Add organization
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <AddOrganizationDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddOrganization}
        isLoading={createOrganizationMutation.isPending}
      />
    </SidebarMenu>
  );
}
