import React from "react";
import { Trash2, Eye, CheckCircle, Clock, Calendar } from "lucide-react";

import type { CustomerInteraction } from "@prisma/client";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  interactionTypeColors,
  interactionTypeDotColors,
  interactionTypeLabels,
} from "~/types/crm";

interface InteractionsTimelineProps {
  interactions: CustomerInteraction[];
  onViewInteraction: (interaction: CustomerInteraction) => void;
  onDeleteInteraction: (id: string) => void;
  getCustomerName: (customerId: string) => string;
  formatDate: (date?: Date) => string;
}

export function InteractionsTimeline({
  interactions,
  onViewInteraction,
  onDeleteInteraction,
  getCustomerName,
  formatDate,
}: InteractionsTimelineProps) {
  // Helper functions using centralized color mappings
  const getInteractionTypeColor = (type: string) => {
    return (
      interactionTypeColors[type as keyof typeof interactionTypeColors] ??
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const getDotColor = (type: string) => {
    return (
      interactionTypeDotColors[type as keyof typeof interactionTypeDotColors] ??
      "bg-gray-500"
    );
  };

  const getInteractionTypeLabel = (type: string) => {
    return (
      interactionTypeLabels[type as keyof typeof interactionTypeLabels] ??
      type.charAt(0) + type.slice(1).toLowerCase()
    );
  };

  // Sort interactions by created date (newest first)
  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="border shadow-sm">
      <CardContent className="px-0 pt-0 pb-2">
        <div className="space-y-0">
          {sortedInteractions.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Clock className="h-12 w-12 opacity-20" />
              <p className="font-medium">No interactions found</p>
              <p className="text-sm">
                Create your first interaction by clicking the &quot;Add
                Interaction&quot; button.
              </p>
            </div>
          ) : (
            sortedInteractions.map((interaction, index) => (
              <div
                key={interaction.id}
                className={cn(
                  "group relative pr-2 pl-6 transition-colors sm:pr-6 sm:pl-10",
                  "pb-5",
                  "border-l-muted/70 border-l-2",
                  index === 0 ? "pt-6" : "pt-5"
                )}
              >
                <div
                  className={cn(
                    "absolute top-5 left-[-4px] h-2 w-2 rounded-full shadow-sm sm:left-[-6px] sm:h-3 sm:w-3",
                    getDotColor(interaction.type)
                  )}
                ></div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          "border font-medium",
                          getInteractionTypeColor(interaction.type)
                        )}
                      >
                        {getInteractionTypeLabel(interaction.type)}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(interaction.createdAt)}
                      </span>
                    </div>

                    <h3 className="mb-0.5 line-clamp-1 text-sm font-medium sm:text-base">
                      {interaction.subject ?? "No Subject"}
                    </h3>

                    <p className="text-muted-foreground mb-2 text-sm">
                      with{" "}
                      <span className="font-medium">
                        {getCustomerName(interaction.customerId)}
                      </span>
                    </p>

                    <div className="text-muted-foreground/90 mb-3 line-clamp-2 text-sm">
                      {interaction.content ?? "No content"}
                    </div>

                    {(interaction.scheduledAt ?? interaction.completedAt) && (
                      <div className="flex flex-wrap gap-2 text-xs sm:gap-3">
                        {interaction.scheduledAt && (
                          <div className="text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              Scheduled: {formatDate(interaction.scheduledAt)}
                            </span>
                          </div>
                        )}
                        {interaction.completedAt ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>
                              Completed: {formatDate(interaction.completedAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 gap-1 opacity-100 transition-opacity sm:self-start sm:opacity-0 sm:group-hover:opacity-100">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onViewInteraction(interaction)}
                            className="h-7 w-7"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="sr-only">View</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View details</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteInteraction(interaction.id)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete interaction</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
