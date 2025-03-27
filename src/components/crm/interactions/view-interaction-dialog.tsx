import React from "react";
import { Trash2, Globe, Clock, RotateCcw, Calendar } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import type { CustomerInteraction } from "~/types/crm";

interface ViewInteractionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  interaction: CustomerInteraction | null;
  getCustomerName: (customerId: string) => string;
  formatDate: (date?: Date) => string;
  onDeleteInteraction: (id: string) => void;
}

export function ViewInteractionDialog({
  isOpen,
  onOpenChange,
  interaction,
  getCustomerName,
  formatDate,
  onDeleteInteraction,
}: ViewInteractionDialogProps) {
  if (!interaction) return null;

  // Get the badge color based on interaction type
  const getInteractionTypeColor = (type: string) => {
    switch (type) {
      case "CALL":
        return "bg-blue-100 text-blue-800";
      case "EMAIL":
        return "bg-green-100 text-green-800";
      case "MEETING":
        return "bg-purple-100 text-purple-800";
      case "NOTE":
        return "bg-yellow-100 text-yellow-800";
      case "TASK":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "font-medium",
                getInteractionTypeColor(interaction.type),
              )}
            >
              {interaction.type}
            </Badge>
            <DialogTitle className="text-xl">
              {interaction.subject ?? "No Subject"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Interaction with {getCustomerName(interaction.customerId)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              <span>
                Medium:{" "}
                <span className="font-medium">{interaction.medium}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                Created:{" "}
                <span className="font-medium">
                  {formatDate(interaction.createdAt)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" />
              <span>
                Updated:{" "}
                <span className="font-medium">
                  {formatDate(interaction.updatedAt)}
                </span>
              </span>
            </div>
          </div>

          {(interaction.scheduledAt ?? interaction.completedAt) && (
            <div className="bg-muted/30 grid gap-4 rounded-md p-3 sm:grid-cols-2">
              {interaction.scheduledAt && (
                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Scheduled At
                  </h4>
                  <p className="text-sm">
                    {formatDate(interaction.scheduledAt)}
                  </p>
                </div>
              )}
              {interaction.completedAt && (
                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Completed At
                  </h4>
                  <p className="text-sm">
                    {formatDate(interaction.completedAt)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="mb-1 text-sm font-medium">Content</h4>
            <div className="bg-muted/30 rounded-md border p-4 whitespace-pre-line">
              {interaction.content ?? "No content available."}
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="destructive"
            onClick={() => {
              onDeleteInteraction(interaction.id);
              onOpenChange(false);
            }}
            className="sm:order-2"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={() => onOpenChange(false)} className="sm:order-1">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
