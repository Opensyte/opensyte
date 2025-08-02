"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import LeadManagementTable from "~/components/crm/contacts/lead-management-table";
import LeadFilters from "~/components/crm/contacts/lead-filters";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import AddLeadDialog from "~/components/crm/contacts/add-lead-dialog";
import EditLeadDialog from "~/components/crm/contacts/edit-lead-dialog";
import { toast } from "sonner";
import type { LeadFormValues as LeadFormValuesEditDialog } from "~/components/crm/contacts/edit-lead-dialog";
import type { LeadFormValues as LeadFormValuesAddDialog } from "~/components/crm/contacts/add-lead-dialog";
import { api } from "~/trpc/react";
import type { Customer } from "@prisma/client";
import { Skeleton } from "~/components/ui/skeleton";

export function ContactsClient() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Customer | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  // tRPC queries and mutations
  const {
    data: contacts,
    isLoading,
    error,
  } = api.contactsCrm.getContactsByOrganization.useQuery({
    organizationId: orgId,
  });

  const utils = api.useUtils();

  const createContactMutation = api.contactsCrm.createContact.useMutation({
    onSuccess: () => {
      void utils.contactsCrm.getContactsByOrganization.invalidate();
    },
  });

  const updateContactMutation = api.contactsCrm.updateContact.useMutation({
    onSuccess: () => {
      void utils.contactsCrm.getContactsByOrganization.invalidate();
    },
  });

  const deleteContactMutation = api.contactsCrm.deleteContact.useMutation({
    onSuccess: () => {
      void utils.contactsCrm.getContactsByOrganization.invalidate();
    },
  });

  // Filter leads based on filters
  const filteredLeads = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter(lead => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false) ||
        (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ??
          false);

      // Status filter
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      // Source filter
      const matchesSource =
        sourceFilter === "all" || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [contacts, searchQuery, statusFilter, sourceFilter]);

  const handleAddLead = async (data: LeadFormValuesAddDialog) => {
    try {
      await createContactMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        position: data.position ?? "",
        status: data.status,
        source: data.source,
        notes: data.notes ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        country: data.country ?? "",
        postalCode: data.postalCode ?? "",
        type: "LEAD", // Default type for new contacts
        organizationId: orgId, // Get from URL params
      });

      setAddDialogOpen(false);
      toast.success(
        `Lead "${data.firstName} ${data.lastName}" has been added.`
      );
    } catch {
      toast.error("Failed to add lead. Please try again.");
    }
  };

  const handleEditLead = async (id: string, data: LeadFormValuesEditDialog) => {
    try {
      await updateContactMutation.mutateAsync({
        id,
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? "",
          phone: data.phone ?? "",
          company: data.company ?? "",
          position: data.position ?? "",
          status: data.status,
          source: data.source,
          notes: data.notes ?? "",
          address: data.address ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
          country: data.country ?? "",
          postalCode: data.postalCode ?? "",
        },
      });

      setEditDialogOpen(false);
      toast.success(
        `Lead "${data.firstName} ${data.lastName}" has been updated.`
      );
    } catch {
      toast.error("Failed to update lead. Please try again.");
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteContactMutation.mutateAsync({ id });
      toast.success("Lead has been deleted.");
    } catch {
      toast.error("Failed to delete lead. Please try again.");
    }
  };

  const openEditDialog = (lead: Customer) => {
    setSelectedLead(lead);
    setEditDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="col-span-full">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="rounded-md border">
                <div className="space-y-4 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-8">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              CRM - Contacts
            </h1>
            <p className="text-muted-foreground">
              Manage your leads, customers, and sales pipeline
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Lead
          </Button>
        </div>

        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <p className="text-red-600">
                Error loading contacts: {error.message}
              </p>
              <Button
                onClick={() =>
                  void utils.contactsCrm.getContactsByOrganization.invalidate()
                }
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM - Contacts</h1>
          <p className="text-muted-foreground">
            Manage your leads, customers, and sales pipeline
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          disabled={createContactMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Lead
        </Button>
      </div>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
          <CardDescription>
            View and manage all your leads in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sourceFilter={sourceFilter}
            onSourceChange={setSourceFilter}
          />

          <LeadManagementTable
            leads={filteredLeads}
            onDeleteLead={handleDeleteLead}
            onEditLead={openEditDialog}
            isDeleting={deleteContactMutation.isPending}
          />
        </CardContent>
      </Card>

      <AddLeadDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSave={handleAddLead}
        isLoading={createContactMutation.isPending}
      />

      <EditLeadDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditLead}
        lead={selectedLead}
        isLoading={updateContactMutation.isPending}
      />
    </div>
  );
}
