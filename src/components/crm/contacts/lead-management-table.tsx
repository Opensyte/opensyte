"use client";
import { useMemo, useState, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
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
import { WithPermissions } from "~/components/shared/permission-button";

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

type SortKey = "name" | "company" | "status" | "source" | "created";
type SortDir = "asc" | "desc";

interface LeadManagementTableProps {
  leads: Customer[];
  onDeleteLead: (id: string) => void;
  onEditLead: (lead: Customer) => void;
  onAddLead?: () => void;
  isDeleting?: boolean;
  organizationId: string;
  userId: string;
}

export default function LeadManagementTable({
  leads,
  onDeleteLead,
  onEditLead,
  onAddLead,
  isDeleting = false,
  organizationId,
  userId,
}: LeadManagementTableProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Customer | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created" ? "desc" : "asc");
    }
  };

  const sortedLeads = useMemo(() => {
    const getValue = (lead: Customer): string | number => {
      switch (sortKey) {
        case "name":
          return `${lead.firstName ?? ""} ${lead.lastName ?? ""}`
            .trim()
            .toLowerCase();
        case "company":
          return (lead.company ?? "").toLowerCase();
        case "status":
          return (lead.status ?? "").toLowerCase();
        case "source":
          return (lead.source ?? "").toLowerCase();
        case "created":
          return new Date(lead.createdAt).getTime();
      }
    };

    return [...leads].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, sortKey, sortDir]);

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

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return (
        <ChevronsUpDown className="text-muted-foreground/50 ml-1 inline h-3.5 w-3.5" />
      );
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
    );
  };

  const SortableHead = ({
    column,
    children,
    className,
  }: {
    column: SortKey;
    children: ReactNode;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="hover:text-foreground -mx-1 flex items-center rounded px-1 py-0.5 font-medium transition-colors"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  return (
    <>
      <div className="max-h-[65vh] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-card sticky top-0 z-10 shadow-[inset_0_-1px_0_var(--border)]">
            <TableRow className="hover:bg-transparent">
              <SortableHead column="name">Name</SortableHead>
              <TableHead>Contact</TableHead>
              <SortableHead column="company">Company</SortableHead>
              <SortableHead column="status">Status</SortableHead>
              <SortableHead column="source">Source</SortableHead>
              <SortableHead column="created">Created</SortableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLeads.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-64">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                      <Users className="text-muted-foreground h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">No leads yet</p>
                      <p className="text-muted-foreground text-sm">
                        Add your first lead to start building your pipeline.
                      </p>
                    </div>
                    {onAddLead && (
                      <WithPermissions
                        userId={userId}
                        organizationId={organizationId}
                        requiredPermission="write"
                        module="crm"
                      >
                        <Button size="sm" onClick={onAddLead} className="mt-1">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add New Lead
                        </Button>
                      </WithPermissions>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedLeads.map(lead => (
                <TableRow key={lead.id} className="group">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {lead.firstName?.charAt(0)}
                          {lead.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium">
                          {`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()}
                        </div>
                        <div className="text-muted-foreground truncate text-sm">
                          {lead.position ?? "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col gap-1">
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                          <a
                            href={`mailto:${lead.email}`}
                            className="max-w-[200px] truncate text-sm hover:underline"
                            title={lead.email}
                          >
                            {lead.email}
                          </a>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                          <a
                            href={`tel:${lead.phone}`}
                            className="truncate text-sm hover:underline"
                            title={lead.phone}
                          >
                            {lead.phone}
                          </a>
                        </div>
                      )}
                      {!lead.email && !lead.phone && (
                        <span className="text-muted-foreground text-sm">
                          No contact info
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2.5">
                    {lead.company ?? "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-medium",
                        lead.status &&
                          leadStatusColors[
                            lead.status as keyof typeof leadStatusColors
                          ]
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
                      <span className="text-sm capitalize">
                        {lead.source?.replace(/_/g, " ").toLowerCase() ??
                          "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2.5 text-sm">
                    {formatDate(lead.createdAt)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => handleViewLead(lead)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View lead</span>
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
                          <DropdownMenuItem onClick={() => handleViewLead(lead)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <WithPermissions
                            userId={userId}
                            organizationId={organizationId}
                            requiredPermission="write"
                            module="crm"
                          >
                            <DropdownMenuItem
                              onClick={() => handleEditLead(lead)}
                              disabled={isDeleting}
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          </WithPermissions>
                          <DropdownMenuSeparator />
                          <WithPermissions
                            userId={userId}
                            organizationId={organizationId}
                            requiredPermission="write"
                            module="crm"
                          >
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteLead(lead)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </WithPermissions>
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
        organizationId={organizationId}
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
