"use client";
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
import Link from "next/link";

// TODO: Add log interaction history

export default function CRMContactsPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            CRM - Contacts Page
          </h1>
          <p className="text-muted-foreground">
            Manage your leads, customers, and sales pipeline
          </p>
        </div>
        <Link href="/crm/leads/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Lead
          </Button>
        </Link>
      </div>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
          <CardDescription>
            View and manage all your leads in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadFilters />
          <LeadManagementTable />
        </CardContent>
      </Card>
    </div>
  );
}
