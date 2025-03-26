'use client'
import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Phone, Mail, Users, File, FileText } from "lucide-react";
import { cn } from "~/lib/utils";

export interface Interaction {
  id: string;
  leadId: string;
  type: string;
  date: Date;
  subject: string;
  notes: string;
}

interface InteractionHistoryProps {
  interactions: Interaction[];
  className?: string;
}

export default function InteractionHistory({
  interactions,
  className,
}: InteractionHistoryProps) {
  // Sort interactions by date (newest first)
  const sortedInteractions = [...interactions].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "CALL":
        return <Phone className="h-4 w-4" />;
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "MEETING":
        return <Users className="h-4 w-4" />;
      case "NOTE":
        return <FileText className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getInteractionTypeLabel = (type: string) => {
    switch (type) {
      case "CALL":
        return "Phone Call";
      case "EMAIL":
        return "Email";
      case "MEETING":
        return "Meeting";
      case "NOTE":
        return "Note";
      default:
        return "Other";
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case "CALL":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "EMAIL":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "MEETING":
        return "bg-green-50 text-green-700 border-green-200";
      case "NOTE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (sortedInteractions.length === 0) {
    return (
      <div className={cn("text-muted-foreground py-8 text-center", className)}>
        No interaction history found.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sortedInteractions.map((interaction) => (
        <div
          key={interaction.id}
          className="hover:bg-accent rounded-lg border p-4 transition-colors"
        >
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center">
              <div
                className={cn(
                  "mr-3 flex items-center justify-center rounded-md p-2",
                  getInteractionColor(interaction.type),
                )}
              >
                {getInteractionIcon(interaction.type)}
              </div>
              <div>
                <h4 className="font-medium">{interaction.subject}</h4>
                <div className="text-muted-foreground flex items-center text-sm">
                  <span className="mr-2">
                    {getInteractionTypeLabel(interaction.type)}
                  </span>
                  <span>•</span>
                  <time
                    className="ml-2"
                    dateTime={interaction.date.toISOString()}
                  >
                    {formatDistanceToNow(interaction.date, { addSuffix: true })}
                  </time>
                </div>
              </div>
            </div>
            <div className="text-muted-foreground text-xs">
              {interaction.date.toLocaleDateString()}
            </div>
          </div>
          <div className="mt-2 text-sm whitespace-pre-line">
            {interaction.notes}
          </div>
        </div>
      ))}
    </div>
  );
}
