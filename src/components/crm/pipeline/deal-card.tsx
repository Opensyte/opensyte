"use client";

import { format, formatDistanceToNow, isPast } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  MoreHorizontal,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { DealWithCustomer } from "~/types/crm";
import { useState } from "react";
import { usePermissions } from "~/hooks/use-permissions";

// Import dialogs
import { EditDealDialog } from "./edit-deal-dialog";
import { DeleteDealDialog } from "./delete-deal-dialog";
import { CustomerDetailsDialog } from "~/components/shared/customer-details-dialog";

interface DealCardProps {
  deal: DealWithCustomer;
  isOverlay?: boolean;
  organizationId: string;
  userId: string;
}

export function DealCard({
  deal,
  isOverlay = false,
  organizationId,
  userId,
}: DealCardProps) {
  // Dialog visibility states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewCustomerOpen, setIsViewCustomerOpen] = useState(false);

  // Permission checks
  const permissions = usePermissions({ userId, organizationId });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "deal",
      deal,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isOverlay ? 999 : "auto",
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: deal.currency ?? "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 70) return "bg-emerald-500";
    if (probability >= 30) return "bg-amber-500";
    return "bg-rose-500";
  };

  const customerName =
    `${deal.customer.firstName} ${deal.customer.lastName}`.trim();
  const initials =
    `${deal.customer.firstName?.[0] ?? ""}${deal.customer.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";

  const isClosed = deal.status === "WON" || deal.status === "LOST";
  const isOverdue =
    !!deal.expectedCloseDate &&
    isPast(new Date(deal.expectedCloseDate)) &&
    !isClosed;

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          "group cursor-grab touch-manipulation gap-0 rounded-lg border py-0 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
          isDragging && "border-primary ring-2 ring-primary/30",
          isOverlay && "rotate-1 shadow-lg"
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-3 pb-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <Avatar className="mt-0.5 h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-0.5">
              <h4 className="line-clamp-1 text-sm font-semibold leading-tight">
                {deal.title}
              </h4>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {customerName}
                {deal.customer.company ? ` · ${deal.customer.company}` : ""}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {permissions.canWriteCRM && (
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit deal
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsViewCustomerOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                View customer
              </DropdownMenuItem>
              {permissions.canWriteCRM && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete deal
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-2.5 p-3 pt-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold tracking-tight">
              {formatValue(Number(deal.value))}
            </span>
            {deal.probability !== null && deal.probability !== undefined && (
              <Badge variant="secondary" className="font-medium tabular-nums">
                {deal.probability}%
              </Badge>
            )}
          </div>

          {deal.probability !== null && deal.probability !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "rounded-full transition-all",
                      getProbabilityColor(deal.probability)
                    )}
                    style={{ width: `${deal.probability}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{deal.probability}% win probability</TooltipContent>
            </Tooltip>
          )}

          {deal.expectedCloseDate && (
            <div className="flex items-center justify-end pt-0.5">
              <Badge
                variant={isOverdue ? "destructive" : "outline"}
                className="gap-1 font-normal"
              >
                <CalendarClock className="h-3 w-3" />
                {isOverdue
                  ? `Overdue ${formatDistanceToNow(new Date(deal.expectedCloseDate), { addSuffix: true })}`
                  : format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {isEditOpen && (
        <EditDealDialog
          deal={deal}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          organizationId={organizationId}
        />
      )}
      {isDeleteOpen && (
        <DeleteDealDialog
          dealId={deal.id}
          dealTitle={deal.title}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          organizationId={organizationId}
        />
      )}
      {isViewCustomerOpen && (
        <CustomerDetailsDialog
          customerName={customerName}
          customerId={deal.customerId}
          organizationId={organizationId}
          open={isViewCustomerOpen}
          onOpenChange={setIsViewCustomerOpen}
        />
      )}
    </>
  );
}
