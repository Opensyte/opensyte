"use client";

import React from "react";
import { DashboardNavbar } from "~/components/organizations/navbar";
import { OrganizationCard } from "~/components/organizations/organization-card";
import { EmptyOrganizations } from "~/components/organizations/empty-organizations";
import { AddOrganizationDialog } from "~/components/organizations/add-organization-dialog";
import { PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { authClient } from "~/lib/auth-client";
import type { OrganizationFormValues } from "~/components/organizations/add-organization-dialog";

function OrganizationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardClient() {
  const { data: session } = authClient.useSession();

  // tRPC queries and mutations
  const {
    data: organizations,
    isLoading,
    error,
  } = api.organization.getAll.useQuery(
    { userId: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id }
  );

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

  if (error) {
    return (
      <div className="bg-background flex min-h-screen flex-col">
        <DashboardNavbar />
        <main className="container mx-auto flex-1 px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Your Organizations
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage and access your organizations
              </p>
            </div>
            <AddOrganizationDialog
              onSave={handleAddOrganization}
              isLoading={createOrganizationMutation.isPending}
              trigger={
                <Button className="w-full gap-2 sm:w-auto">
                  <PlusIcon className="h-4 w-4" />
                  New Organization
                </Button>
              }
            />
          </div>

          <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-6 text-center">
            <p className="text-destructive font-medium">
              Error loading organizations: {error.message}
            </p>
            <Button
              onClick={() => void utils.organization.getAll.invalidate()}
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <DashboardNavbar />
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Your Organizations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and access your organizations
            </p>
          </div>
          <AddOrganizationDialog
            onSave={handleAddOrganization}
            isLoading={createOrganizationMutation.isPending}
            trigger={
              <Button className="w-full gap-2 sm:w-auto">
                <PlusIcon className="h-4 w-4" />
                New Organization
              </Button>
            }
          />
        </div>

        {isLoading ? (
          <OrganizationsSkeleton />
        ) : organizations && organizations.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map(org => (
              <OrganizationCard
                key={org.id}
                id={org.id}
                name={org.name}
                description={org.description}
                logo={org.logo}
                website={org.website}
                industry={org.industry}
                membersCount={org.membersCount}
                userRole={org.userRole}
                createdAt={org.createdAt}
              />
            ))}
          </div>
        ) : (
          <EmptyOrganizations />
        )}
      </main>
    </div>
  );
}
