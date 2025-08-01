"use client";

import { formatDistanceToNow } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart3,
  Calendar,
  MoreHorizontal,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import type { Deal } from "~/types/crm";
import { useState } from "react";

// Import dialogs
import { EditDealDialog } from "./edit-deal-dialog";
import { DeleteDealDialog } from "./delete-deal-dialog";
import { CustomerDetailsDialog } from "~/components/shared/customer-details-dialog";

interface DealCardProps {
  deal: Deal;
  isOverlay?: boolean;
  organizationId: string;
}

export function DealCard({
  deal,
  isOverlay = false,
  organizationId,
}: DealCardProps) {
  // Dialog visibility states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewCustomerOpen, setIsViewCustomerOpen] = useState(false);
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
    if (probability >= 70) return "bg-green-500";
    if (probability >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return null;
    const dateObj = new Date(date);
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`cursor-grab touch-manipulation border ${isDragging ? "border-primary" : ""} ${
          isOverlay ? "shadow-lg" : ""
        }`}
      >
        <CardHeader className="flex flex-row items-start justify-between p-3 pb-0">
          <div className="space-y-1">
            <h4 className="line-clamp-1 text-sm font-medium">{deal.title}</h4>
            <div className="flex items-center gap-1">
              <span className="text-xl font-semibold">
                {formatValue(deal.value)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={e => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit deal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsViewCustomerOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                View customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="text-muted-foreground flex items-center text-xs">
            <User className="mr-1 h-3 w-3" />
            {deal.customerName}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-3 pt-0">
          {deal.probability !== null && deal.probability !== undefined && (
            <div className="flex items-center gap-1">
              <BarChart3 className="text-muted-foreground h-3 w-3" />
              <div className="bg-muted flex h-1.5 w-12 overflow-hidden rounded-full">
                <div
                  className={`${getProbabilityColor(deal.probability)}`}
                  style={{ width: `${deal.probability}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs">
                {deal.probability}%
              </span>
            </div>
          )}
          {deal.expectedCloseDate && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {formatDate(deal.expectedCloseDate)}
            </div>
          )}
        </CardFooter>
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
          customerName={deal.customerName}
          customerId={deal.customerId}
          open={isViewCustomerOpen}
          onOpenChange={setIsViewCustomerOpen}
        />
      )}
    </>
  );
}
