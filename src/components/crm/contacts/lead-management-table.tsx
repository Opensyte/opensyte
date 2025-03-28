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
import ViewLeadDialog from "./view-lead-dialog";
import DeleteLeadDialog from "./delete-lead-dialog";
import type { Customer } from "~/types/crm";
import type { LeadStatus, LeadSource } from "~/types/crm-enums";

// Extended Customer type for the CRM leads
interface Lead extends Customer {
  status?: LeadStatus;
  source?: LeadSource;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadManagementTableProps {
  leads: Lead[];
  onDeleteLead: (id: string) => void;
  onEditLead: (lead: Lead) => void;
}

const statusColorMap = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-purple-100 text-purple-800",
  Qualified: "bg-green-100 text-green-800",
  Proposal: "bg-yellow-100 text-yellow-800",
  Negotiation: "bg-orange-100 text-orange-800",
  "Closed Won": "bg-green-100 text-green-800",
  "Closed Lost": "bg-red-100 text-red-800",
};

const sourceIconMap = {
  Website: "🌐",
  Referral: "👥",
  "Social Media": "📱",
  "Email Campaign": "📧",
  Event: "🎫",
  "Cold Call": "📞",
  Other: "📌",
};

export default function LeadManagementTable({
  leads,
  onDeleteLead,
  onEditLead,
}: LeadManagementTableProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setViewDialogOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    onEditLead(lead);
  };

  const handleDeleteLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLead = () => {
    if (selectedLead) {
      onDeleteLead(selectedLead.id);
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
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <div className="bg-muted flex h-full w-full items-center justify-center">
                        {lead.firstName.charAt(0)}
                        {lead.lastName.charAt(0)}
                      </div>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {lead.position}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    {lead.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="text-muted-foreground mr-1 h-4 w-4" />
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-sm hover:underline"
                        >
                          {lead.email}
                        </a>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="text-muted-foreground mr-1 h-4 w-4" />
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-sm hover:underline"
                        >
                          {lead.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{lead.company ?? "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={lead.status && statusColorMap[lead.status]}
                  >
                    {lead.status?.replace(/_/g, " ") ?? "N/A"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <span className="mr-1">
                      {lead.source && sourceIconMap[lead.source]}
                    </span>
                    <span>{lead.source?.replace(/_/g, " ") ?? "N/A"}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(lead.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewLead(lead)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteLead(lead)}
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

      {/* Dialogs */}
      <ViewLeadDialog
        isOpen={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        lead={selectedLead ?? undefined}
      />

      <DeleteLeadDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteLead}
        leadName={
          selectedLead
            ? `${selectedLead.firstName} ${selectedLead.lastName}`
            : ""
        }
      />
    </>
  );
}
