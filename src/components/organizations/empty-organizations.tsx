"use client";

import { BuildingIcon, PlusIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

export function EmptyOrganizations() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-primary/10 mb-4 rounded-full p-4">
        <BuildingIcon className="text-primary h-12 w-12" />
      </div>
      <h2 className="mb-2 text-2xl font-semibold">No Organizations</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        You don&apos;t have any organizations yet. Create your first organization to
        get started.
      </p>
      <Button className="gap-2">
        <PlusIcon className="h-4 w-4" />
        Create Organization
      </Button>
    </div>
  );
}
