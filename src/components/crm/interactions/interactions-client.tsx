import React, { useState } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
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
import type {
  CustomerInteraction,
  InteractionType,
  InteractionMedium,
} from "~/types/crm";
import { useInteractionsStore } from "~/store/crm/interactions";
import { useLeadsStore } from "~/store/crm/leads";

export function InteractionsClient() {
  const { addInteraction, deleteInteraction, getFilteredInteractions } =
    useInteractionsStore();
  const { leads } = useLeadsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentInteraction, setCurrentInteraction] =
    useState<CustomerInteraction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | InteractionType>("ALL");

  // Filter interactions based on search term and type filter
  const filteredInteractions = getFilteredInteractions({
    customers: leads,
    searchTerm,
    type: filterType,
  });

  // Handle adding new interaction
  const handleAddInteraction = (formData: {
    customerId: string;
    type: InteractionType;
    medium: InteractionMedium;
    subject: string;
    content: string;
    scheduledAt: Date | null;
    completedAt: Date | null;
  }) => {
    const newInteraction: CustomerInteraction = {
      id: uuidv4(),
      customerId: formData.customerId,
      type: formData.type,
      medium: formData.medium,
      subject: formData.subject,
      content: formData.content,
      scheduledAt: formData.scheduledAt!,
      completedAt: formData.completedAt!,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addInteraction(newInteraction);

    toast.success("Interaction added", {
      description: `${newInteraction.type.charAt(0) + newInteraction.type.slice(1).toLowerCase()} has been recorded.`,
    });
  };

  // Handle deleting an interaction
  const handleDeleteInteraction = (id: string) => {
    deleteInteraction(id);
    toast.success("Interaction deleted", {
      description: "The interaction has been removed.",
    });
  };

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = leads.find((c) => c.id === customerId);
    return customer
      ? `${customer.firstName} ${customer.lastName}`
      : "Unknown Customer";
  };

  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return "N/A";
    return format(date, "MMM d, yyyy h:mm a");
  };

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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            onViewInteraction={(interaction) => {
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
            onViewInteraction={(interaction) => {
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
        customers={leads}
      />

      {/* View Interaction Dialog */}
      <ViewInteractionDialog
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        interaction={currentInteraction}
        getCustomerName={getCustomerName}
        formatDate={formatDate}
        onDeleteInteraction={handleDeleteInteraction}
      />
    </div>
  );
}
