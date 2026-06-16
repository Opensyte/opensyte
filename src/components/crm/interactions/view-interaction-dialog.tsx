"use client";
import { Globe, Clock, RotateCcw, Calendar, MessageSquare } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import type { CustomerInteraction } from "@prisma/client";
import { interactionTypeColors } from "~/types/crm";

interface ViewInteractionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  interaction: CustomerInteraction | null;
  getCustomerName: (customerId: string) => string;
  formatDate: (date?: Date) => string;
}

export function ViewInteractionDialog({
  isOpen,
  onOpenChange,
  interaction,
  getCustomerName,
  formatDate,
}: ViewInteractionDialogProps) {
  if (!interaction) return null;

  // Get the badge color based on interaction type using centralized mapping
  const getInteractionTypeColor = (type: string) =>
    interactionTypeColors[type as keyof typeof interactionTypeColors] ??
    "bg-muted text-muted-foreground";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("font-medium", getInteractionTypeColor(interaction.type))}
                >
                  {interaction.type}
                </Badge>
                <DialogTitle className="text-lg">
                  {interaction.subject ?? "No Subject"}
                </DialogTitle>
              </div>
              <DialogDescription>
                Interaction with {getCustomerName(interaction.customerId)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-4">
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              <span>
                Medium:{" "}
                <span className="font-medium text-foreground">
                  {interaction.medium}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                Created:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(interaction.createdAt)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" />
              <span>
                Updated:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(interaction.updatedAt)}
                </span>
              </span>
            </div>
          </div>

          {(interaction.scheduledAt ?? interaction.completedAt) && (
            <div className="grid gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
              {interaction.scheduledAt && (
                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Scheduled At
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(interaction.scheduledAt)}
                  </p>
                </div>
              )}
              {interaction.completedAt && (
                <div>
                  <h4 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Completed At
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(interaction.completedAt)}
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div>
            <h4 className="mb-2 text-sm font-medium">Content</h4>
            <div className="max-h-[220px] overflow-y-auto whitespace-pre-line rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
              {interaction.content ?? "No content available."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
