"use client";

import { useState, useMemo } from "react";
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
import { customers } from "~/lib/sample-data";
import { CustomerType, LeadStatus, LeadSource } from "~/types/crm-enums";
import { v4 as uuidv4 } from "uuid";
import type { LeadFormValues } from "~/components/crm/contacts/edit-lead-dialog";

// Convert sample data to Customer format for CRM
const initialLeads = customers.map((customer) => ({
  id: customer.id || uuidv4(),
  organizationId: "org_default",
  type: CustomerType.LEAD,
  status: LeadStatus.NEW,
  firstName: customer.firstName,
  lastName: customer.lastName,
  email: customer.email,
  phone: "",
  company: customer.company,
  position: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  source: LeadSource.WEBSITE,
  notes: "",
  createdAt: new Date(),
  updatedAt: new Date(),
}));

export function ContactsClient() {
  const [leads, setLeads] = useState(initialLeads);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<
    (typeof initialLeads)[0] | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Filter leads based on filters
  // TODO: Solve these types errors
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email &&
          lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.company &&
          lead.company.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      // Source filter
      const matchesSource =
        sourceFilter === "all" || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter]);

  const handleAddLead = (data: LeadFormValues) => {
    const newLead = {
      id: uuidv4(),
      organizationId: "org_default",
      type: CustomerType.LEAD,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? "",
      phone: data.phone ?? "",
      company: data.company ?? "",
      position: data.position ?? "",
      status: data.status as LeadStatus,
      source: data.source as LeadSource,
      notes: data.notes ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      country: data.country ?? "",
      postalCode: data.postalCode ?? "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setLeads([newLead, ...leads]);
    setAddDialogOpen(false);
    toast.success(`Lead "${data.firstName} ${data.lastName}" has been added.`);
  };

  const handleEditLead = (id: string, data: LeadFormValues) => {
    setLeads(
      leads.map((lead) => {
        if (lead.id === id) {
          return {
            ...lead,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email ?? "",
            phone: data.phone ?? "",
            company: data.company ?? "",
            position: data.position ?? "",
            status: data.status as LeadStatus,
            source: data.source as LeadSource,
            notes: data.notes ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            state: data.state ?? "",
            country: data.country ?? "",
            postalCode: data.postalCode ?? "",
            updatedAt: new Date(),
          };
        }
        return lead;
      }),
    );
    setEditDialogOpen(false);
    toast.success(
      `Lead "${data.firstName} ${data.lastName}" has been updated.`,
    );
  };

  const handleDeleteLead = (id: string) => {
    const leadToDelete = leads.find((lead) => lead.id === id);
    if (leadToDelete) {
      setLeads(leads.filter((lead) => lead.id !== id));
      toast.success(
        `Lead "${leadToDelete.firstName} ${leadToDelete.lastName}" has been deleted.`,
      );
    }
  };

  const openEditDialog = (lead: (typeof leads)[0]) => {
    setSelectedLead(lead);
    setEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM - Contacts</h1>
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

          <div className="rounded-md border">
            <LeadManagementTable
              leads={filteredLeads}
              onDeleteLead={handleDeleteLead}
              onEditLead={openEditDialog}
            />
          </div>
        </CardContent>
      </Card>

      <AddLeadDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSave={handleAddLead}
      />

      <EditLeadDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleEditLead}
        lead={selectedLead}
      />
    </div>
  );
}
