"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Checkbox } from "~/components/ui/checkbox";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { CustomerDetailsDialog } from "~/components/shared/customer-details-dialog";
import DeleteLeadDialog from "./delete-lead-dialog";
import type { Customer } from "@prisma/client";
import { leadStatusColors, leadStatusLabels } from "~/types/crm";
import { cn } from "~/lib/utils";
import { WithPermissions } from "~/components/shared/permission-button";

type SortKey = "name" | "status" | "created";
type SortDir = "asc" | "desc";

interface LeadManagementTableProps {
  leads: Customer[];
  onDeleteLead: (id: string) => void;
  onBulkDeleteLeads?: (ids: string[]) => void;
  onEditLead: (lead: Customer) => void;
  onAddLead?: () => void;
  isDeleting?: boolean;
  organizationId: string;
  userId: string;
}

export default function LeadManagementTable({
  leads,
  onDeleteLead,
  onBulkDeleteLeads,
  onEditLead,
  onAddLead,
  isDeleting = false,
  organizationId,
  userId,
}: LeadManagementTableProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
        case "status":
          return (lead.status ?? "").toLowerCase();
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

  // Keep selection in sync with the available leads (drop stale ids).
  useEffect(() => {
    setSelectedIds(prev => {
      const ids = new Set(leads.map(l => l.id));
      const next = new Set([...prev].filter(id => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [leads]);

  const allSelected =
    sortedLeads.length > 0 && sortedLeads.every(l => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === sortedLeads.length && sortedLeads.length > 0
        ? new Set()
        : new Set(sortedLeads.map(l => l.id))
    );
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleViewLead = (lead: Customer) => {
    setSelectedLead(lead);
    setViewDialogOpen(true);
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

  const confirmBulkDelete = () => {
    onBulkDeleteLeads?.([...selectedIds]);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column)
      return (
        <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />
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
        className="-mx-1 flex items-center rounded px-1 py-0.5 font-medium transition-colors hover:text-foreground"
      >
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  return (
    <>
      {/* Bulk selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-col gap-2 rounded-md border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 px-2 text-sm">
            <span className="font-medium">{selectedIds.size} selected</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
          <WithPermissions
            userId={userId}
            organizationId={organizationId}
            requiredPermission="write"
            module="crm"
          >
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected
            </Button>
          </WithPermissions>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-md border">
        <div className="max-h-[65vh] overflow-y-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[44px]">
                  <Checkbox
                    aria-label="Select all"
                    checked={
                      allSelected ? true : someSelected ? "indeterminate" : false
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <SortableHead column="name">Name</SortableHead>
                <SortableHead
                  column="status"
                  className="hidden w-[160px] sm:table-cell"
                >
                  Status
                </SortableHead>
                <TableHead className="w-[60px] text-right sm:w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeads.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-64">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">No leads yet</p>
                        <p className="text-sm text-muted-foreground">
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
                sortedLeads.map(lead => {
                  const checked = selectedIds.has(lead.id);
                  return (
                    <TableRow
                      key={lead.id}
                      data-state={checked ? "selected" : undefined}
                      className="group"
                    >
                      <TableCell className="py-2.5">
                        <Checkbox
                          aria-label={`Select ${lead.firstName}`}
                          checked={checked}
                          onCheckedChange={() => toggleOne(lead.id)}
                        />
                      </TableCell>
                      <TableCell className="py-2.5">
                        <button
                          type="button"
                          onClick={() => handleViewLead(lead)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {lead.firstName?.charAt(0)}
                              {lead.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium hover:underline">
                              {`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {lead.email ?? lead.company ?? "—"}
                            </div>
                            {/* Status is its own column on sm+, shown inline on mobile */}
                            <Badge
                              variant="secondary"
                              className={cn(
                                "mt-1 font-medium sm:hidden",
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
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="hidden py-2.5 sm:table-cell">
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
                      <TableCell className="py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hidden opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 sm:inline-flex"
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
                              <DropdownMenuItem
                                onClick={() => handleViewLead(lead)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <WithPermissions
                                userId={userId}
                                organizationId={organizationId}
                                requiredPermission="write"
                                module="crm"
                              >
                                <DropdownMenuItem
                                  onClick={() => onEditLead(lead)}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <AlertDialogTitle>
                  Delete {selectedIds.size} lead
                  {selectedIds.size === 1 ? "" : "s"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The selected leads and all their
                  associated data will be permanently removed.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={isDeleting}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
