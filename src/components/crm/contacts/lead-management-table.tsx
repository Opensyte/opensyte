"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { Button } from "~/components/ui/button";
import { Avatar } from "~/components/ui/avatar";
import { Eye, MoreHorizontal, Pencil, Phone, Mail, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { CustomerDetailsDialog } from "~/components/shared/customer-details-dialog";
import DeleteLeadDialog from "./delete-lead-dialog";
import type { Customer } from "@prisma/client";
import { leadStatusColors, leadStatusLabels } from "~/types/crm";
import { cn } from "~/lib/utils";

// Extended Customer type for the CRM leads

// Helper function to get source icon
const getSourceIcon = (source: string) => {
  const sourceIconMap = {
    WEBSITE: "🌐",
    REFERRAL: "👥",
    SOCIAL_MEDIA: "📱",
    EMAIL_CAMPAIGN: "✉️",
    EVENT: "🎯",
    COLD_CALL: "📞",
    OTHER: "❓",
  } as const;
  return sourceIconMap[source as keyof typeof sourceIconMap] ?? "❓";
};

interface LeadManagementTableProps {
  leads: Customer[];
  onDeleteLead: (id: string) => void;
  onEditLead: (lead: Customer) => void;
  isDeleting?: boolean;
}

// Color maps and icon maps are now centralized in ~/types/crm and handled by helper functions

export default function LeadManagementTable({
  leads,
  onDeleteLead,
  onEditLead,
  isDeleting = false,
}: LeadManagementTableProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Customer | null>(null);

  const handleViewLead = (lead: Customer) => {
    setSelectedLead(lead);
    setViewDialogOpen(true);
  };

  const handleEditLead = (lead: Customer) => {
    onEditLead(lead);
  };

  const handleDeleteLead = (lead: Customer) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLead = () => {
    if (selectedLead?.id) {
      onDeleteLead(selectedLead.id);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No leads found. Add your first lead to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map(lead => (
                    <TableRow key={lead.id} className="group hover:bg-muted/50">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <div className="bg-muted flex h-full w-full items-center justify-center">
                              {lead.firstName?.charAt(0)}
                              {lead.lastName?.charAt(0)}
                            </div>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {`${lead.firstName ?? ""} ${lead.lastName ?? ""}`}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {lead.position ?? "N/A"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-col gap-1">
                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a
                                href={`mailto:${lead.email}`}
                                className="text-sm hover:underline truncate max-w-[200px]"
                                title={lead.email}
                              >
                                {lead.email}
                              </a>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a
                                href={`tel:${lead.phone}`}
                                className="text-sm hover:underline truncate"
                                title={lead.phone}
                              >
                                {lead.phone}
                              </a>
                            </div>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-sm text-muted-foreground">
                              No contact info
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {lead.company ?? "-"}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          className={cn(
                            "px-2 py-0.5 font-medium",
                            lead.status
                              ? leadStatusColors[
                                  lead.status as keyof typeof leadStatusColors
                                ]
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          )}
                        >
                          {lead.status
                            ? (leadStatusLabels[
                                lead.status as keyof typeof leadStatusLabels
                              ] ?? lead.status)
                            : "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {lead.source ? getSourceIcon(lead.source) : "❓"}
                          </span>
                          <span className="capitalize text-sm">
                            {lead.source ?? "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-muted-foreground text-sm">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewLead(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isDeleting}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleViewLead(lead)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditLead(lead)}
                                disabled={isDeleting}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteLead(lead)}
                                disabled={isDeleting}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <CustomerDetailsDialog
        customerName={
          selectedLead
            ? `${selectedLead.firstName ?? ""} ${selectedLead.lastName ?? ""}`
            : ""
        }
        customerId={selectedLead?.id ?? ""}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <DeleteLeadDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteLead}
        leadName={
          selectedLead
            ? `${selectedLead.firstName ?? ""} ${selectedLead.lastName ?? ""}`
            : ""
        }
        isLoading={isDeleting}
      />
    </>
  );
}
