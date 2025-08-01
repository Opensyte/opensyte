"use client";

import { BuildingIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AddOrganizationDialog } from "~/components/organizations/add-organization-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import type { OrganizationFormValues } from "~/components/organizations/add-organization-dialog";

export function EmptyOrganizations() {
  const { data: session } = authClient.useSession();
  const utils = api.useUtils();

  const createOrganizationMutation = api.organization.create.useMutation({
    onSuccess: () => {
      void utils.organization.getAll.invalidate();
      toast.success("Organization created successfully!");
    },
    onError: error => {
      toast.error(error.message || "Failed to create organization");
    },
  });

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

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-primary/10 mb-4 rounded-full p-4">
        <BuildingIcon className="text-primary h-12 w-12" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold">Get Started</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Create your first organization to start managing your business
        operations and unlock all platform features.
      </p>
      <AddOrganizationDialog
        onSave={handleAddOrganization}
        isLoading={createOrganizationMutation.isPending}
        trigger={
          <Button className="gap-2" disabled={!session?.user?.id}>
            <PlusIcon className="h-4 w-4" />
            Create Organization
          </Button>
        }
      />
    </div>
  );
}
