import React, { useState } from "react";
import { format } from "date-fns";
import { PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { InteractionsTable } from "~/components/crm/interactions/interactions-table";
import { InteractionsTimeline } from "~/components/crm/interactions/interactions-timeline";
import { AddInteractionDialog } from "~/components/crm/interactions/add-interaction-dialog";
import { ViewInteractionDialog } from "~/components/crm/interactions/view-interaction-dialog";
import { InteractionsSkeleton } from "~/components/crm/interactions/interactions-skeleton";
import type {
  CustomerInteraction,
  InteractionType,
  InteractionMedium,
} from "~/types/crm";
import { api } from "~/trpc/react";

interface InteractionsClientProps {
  organizationId: string;
}

export function InteractionsClient({
  organizationId,
}: InteractionsClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentInteraction, setCurrentInteraction] =
    useState<CustomerInteraction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | InteractionType>("ALL");

  // tRPC queries and mutations
  const {
    data: interactions = [],
    isLoading,
    error,
  } = api.interactions.getByOrganization.useQuery(
    { organizationId },
    {
      refetchOnWindowFocus: false,
      enabled: !!organizationId, // Only run query if organizationId is provided
    }
  ) as { data: CustomerInteraction[]; isLoading: boolean; error: Error | null };

  // Fetch customers for the organization
  const { data: customers = [] } =
    api.contactsCrm.getContactsByOrganization.useQuery(
      { organizationId },
      {
        refetchOnWindowFocus: false,
        enabled: !!organizationId, // Only run query if organizationId is provided
      }
    );

  const createInteraction = api.interactions.createInteraction.useMutation({
    onSuccess: () => {
      toast.success("Interaction added");
      void utils.interactions.invalidate();
    },
    onError: () => {
      toast.error("Failed to add interaction");
    },
  });

  api.interactions.updateInteraction.useMutation({
    onSuccess: () => {
      toast.success("Interaction updated");
      void utils.interactions.invalidate();
    },
    onError: () => {
      toast.error("Failed to update interaction");
    },
  });

  const deleteInteraction = api.interactions.deleteInteraction.useMutation({
    onSuccess: () => {
      toast.success("Interaction deleted");
      void utils.interactions.invalidate();
    },
    onError: () => {
      toast.error("Failed to delete interaction");
    },
  });

  const utils = api.useUtils();

  // Filter interactions based on search term and type filter
  const filteredInteractions = interactions.filter(interaction => {
    const matchesSearch =
      searchTerm === "" ||
      (interaction.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false) ||
      (interaction.content?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false);

    const matchesType = filterType === "ALL" || interaction.type === filterType;

    return matchesSearch && matchesType;
  });

  // Handle adding new interaction
  const handleAddInteraction = async (formData: {
    customerId: string;
    type: InteractionType;
    medium: InteractionMedium;
    subject: string;
    content: string;
    scheduledAt: Date | null;
    completedAt: Date | null;
  }) => {
    try {
      await createInteraction.mutateAsync({
        customerId: formData.customerId,
        type: formData.type,
        medium: formData.medium,
        subject: formData.subject,
        content: formData.content,
        scheduledAt: formData.scheduledAt,
        completedAt: formData.completedAt,
      });
      setIsAddDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  // Handle deleting an interaction
  const handleDeleteInteraction = async (id: string) => {
    try {
      await deleteInteraction.mutateAsync({ id });
      setIsViewDialogOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer
      ? `${customer.firstName} ${customer.lastName}`
      : "Unknown Customer";
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return "N/A";
    return format(date, "PPp");
  };

  // Show skeleton loading while data is being fetched
  if (isLoading) {
    return <InteractionsSkeleton />;
  }

  // Show error state if query failed
  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-2">
                Failed to load interactions
              </p>
              <p className="text-sm text-muted-foreground">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Customer Interactions
          </h1>
          <p className="text-muted-foreground">
            Manage and track all communications with your customers.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Interaction
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Filter interactions by type or search for specific content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="Search interactions..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Select
                value={filterType}
                onValueChange={(value: "ALL" | InteractionType) =>
                  setFilterType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="CALL">Calls</SelectItem>
                  <SelectItem value="EMAIL">Emails</SelectItem>
                  <SelectItem value="MEETING">Meetings</SelectItem>
                  <SelectItem value="NOTE">Notes</SelectItem>
                  <SelectItem value="TASK">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <InteractionsTable
            interactions={filteredInteractions}
            onViewInteraction={interaction => {
              setCurrentInteraction(interaction);
              setIsViewDialogOpen(true);
            }}
            onDeleteInteraction={handleDeleteInteraction}
            getCustomerName={getCustomerName}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <InteractionsTimeline
            interactions={filteredInteractions}
            onViewInteraction={interaction => {
              setCurrentInteraction(interaction);
              setIsViewDialogOpen(true);
            }}
            onDeleteInteraction={handleDeleteInteraction}
            getCustomerName={getCustomerName}
            formatDate={formatDate}
          />
        </TabsContent>
      </Tabs>

      {/* Add Interaction Dialog */}
      <AddInteractionDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddInteraction={handleAddInteraction}
        customers={customers}
        isLoading={createInteraction.isPending}
      />

      {/* View Interaction Dialog */}
      <ViewInteractionDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        interaction={currentInteraction}
        getCustomerName={getCustomerName}
        formatDate={formatDate}
      />
    </div>
  );
}
