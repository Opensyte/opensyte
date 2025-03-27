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
import { toast } from "sonner";
import { customers } from "~/lib/sample-data";
import { CustomerType, LeadStatus, LeadSource } from "~/types/crm-enums";
import { v4 as uuidv4 } from "uuid";

// TODO: Create files inside components folder for client logic
// TODO: Adding edit functionality

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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export default function CRMContactsPage() {
  const [leads, setLeads] = useState(initialLeads);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Filter leads based on filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        lead.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lead.company && lead.company.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      
      // Source filter
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;
      
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter]);

  const handleAddLead = (data: any) => {
    const newLead = {
      id: uuidv4(),
      organizationId: "org_default",
      type: CustomerType.LEAD,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || "",
      phone: data.phone || "",
      company: data.company || "",
      position: data.position || "",
      status: data.status,
      source: data.source,
      notes: data.notes || "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setLeads([newLead, ...leads]);
    setAddDialogOpen(false);
    toast.success(`Lead "${data.firstName} ${data.lastName}" has been added.`);
  };

  const handleDeleteLead = (id: string) => {
    const leadToDelete = leads.find(lead => lead.id === id);
    if (leadToDelete) {
      setLeads(leads.filter(lead => lead.id !== id));
      toast.success(`Lead "${leadToDelete.firstName} ${leadToDelete.lastName}" has been deleted.`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
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
            />
          </div>
        </CardContent>
      </Card>

      <AddLeadDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSave={handleAddLead}
      />
    </div>
  );
}
