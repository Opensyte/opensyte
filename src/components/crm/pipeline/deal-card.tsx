"use client";

import { formatDistanceToNow } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BarChart3, Calendar, MoreHorizontal, User } from "lucide-react";
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
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { useCallback } from "react";
import type { Deal, DealUpdateFunction } from "~/types/crm";

interface DealCardProps {
  deal: Deal;
  onUpdate: DealUpdateFunction;
  isOverlay?: boolean;
}

export function DealCard({ deal, onUpdate, isOverlay = false }: DealCardProps) {
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

  // Using useCallback to memoize the edit handler
  const handleEditDeal = useCallback(() => {
    // For now, we'll just log that the edit action was triggered
    // In a real app, you might open a modal or navigate to an edit page
    console.log("Edit deal clicked for:", deal.title);

    // Only call onUpdate if you're actually changing the deal
    // Don't call it if no changes were made
    // For demonstration, let's add a timestamp to indicate an edit happened
    // In a real app, you'd have proper edit functionality
    const updatedDeal = {
      ...deal,
      lastEdited: new Date().toISOString(),
    };

    onUpdate(updatedDeal);
  }, [deal, onUpdate]);

  return (
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
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditDeal}>
              Edit deal
            </DropdownMenuItem>
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
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
  );
}
