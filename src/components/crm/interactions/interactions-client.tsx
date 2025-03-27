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

// Mock data for customers
const mockCustomers = [
  {
    id: "cust1",
    firstName: "John",
    lastName: "Doe",
    company: "Acme Inc.",
    email: "john@acme.com",
  },
  {
    id: "cust2",
    firstName: "Jane",
    lastName: "Smith",
    company: "Globex Corp",
    email: "jane@globex.com",
  },
  {
    id: "cust3",
    firstName: "Robert",
    lastName: "Johnson",
    company: "Initech",
    email: "robert@initech.com",
  },
  {
    id: "cust4",
    firstName: "Sarah",
    lastName: "Williams",
    company: "Umbrella Corp",
    email: "sarah@umbrella.com",
  },
  {
    id: "cust5",
    firstName: "Michael",
    lastName: "Brown",
    company: "Stark Industries",
    email: "michael@stark.com",
  },
];

// Mock data for interactions
const initialInteractions: CustomerInteraction[] = [
  {
    id: "int1",
    customerId: "cust1",
    type: "CALL",
    medium: "PHONE",
    subject: "Initial Sales Call",
    content:
      "Discussed product features and pricing options. Client seemed interested in our premium plan.",
    scheduledAt: new Date("2023-04-10T10:00:00"),
    completedAt: new Date("2023-04-10T10:45:00"),
    createdAt: new Date("2023-04-09T14:30:00"),
    updatedAt: new Date("2023-04-10T11:00:00"),
  },
  {
    id: "int2",
    customerId: "cust2",
    type: "EMAIL",
    medium: "EMAIL",
    subject: "Follow-up on Demo",
    content:
      "Sent a follow-up email after the product demonstration with additional resources and pricing details.",
    completedAt: new Date("2023-04-15T09:15:00"),
    createdAt: new Date("2023-04-15T09:15:00"),
    updatedAt: new Date("2023-04-15T09:15:00"),
  },
  {
    id: "int3",
    customerId: "cust3",
    type: "MEETING",
    medium: "VIDEO",
    subject: "Product Demo",
    content:
      "Walked through our platform features and showed how our solution addresses their specific needs.",
    scheduledAt: new Date("2023-04-18T14:00:00"),
    completedAt: new Date("2023-04-18T15:30:00"),
    createdAt: new Date("2023-04-16T11:20:00"),
    updatedAt: new Date("2023-04-18T16:00:00"),
  },
  {
    id: "int4",
    customerId: "cust1",
    type: "NOTE",
    medium: "OTHER",
    subject: "Client Requirements",
    content:
      "Client needs integration with their existing ERP system. Need to check with the engineering team about feasibility.",
    createdAt: new Date("2023-04-12T16:45:00"),
    updatedAt: new Date("2023-04-12T16:45:00"),
  },
  {
    id: "int5",
    customerId: "cust4",
    type: "TASK",
    medium: "OTHER",
    subject: "Prepare Proposal",
    content:
      "Create a customized proposal based on the requirements discussed in the meeting.",
    scheduledAt: new Date("2023-04-22T00:00:00"),
    createdAt: new Date("2023-04-19T10:30:00"),
    updatedAt: new Date("2023-04-19T10:30:00"),
  },
];

export function InteractionsClient() {
  const [interactions, setInteractions] =
    useState<CustomerInteraction[]>(initialInteractions);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentInteraction, setCurrentInteraction] =
    useState<CustomerInteraction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Filter interactions based on search term and type filter
  const filteredInteractions = interactions.filter((interaction) => {
    const customer = mockCustomers.find((c) => c.id === interaction.customerId);
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`
      : "";
    const matchesSearch =
      interaction.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ??
      interaction.content?.toLowerCase().includes(searchTerm.toLowerCase()) ??
      customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "ALL" || interaction.type === filterType;

    return matchesSearch && matchesType;
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

    setInteractions([...interactions, newInteraction]);

    toast.success("Interaction added", {
      description: `${newInteraction.type.charAt(0) + newInteraction.type.slice(1).toLowerCase()} has been recorded.`,
    });
  };

  // Handle deleting an interaction
  const handleDeleteInteraction = (id: string) => {
    setInteractions(
      interactions.filter((interaction) => interaction.id !== id),
    );
    toast.success("Interaction deleted", {
      description: "The interaction has been removed.",
    });
  };

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = mockCustomers.find((c) => c.id === customerId);
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
    <div className="container mx-auto space-y-6 py-6">
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
              <Select value={filterType} onValueChange={setFilterType}>
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
        customers={mockCustomers}
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
