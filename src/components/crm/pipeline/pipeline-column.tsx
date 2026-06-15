"use client";

import { useId, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DealCard } from "./deal-card";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { DealWithCustomer } from "~/types/crm";

interface PipelineColumnProps {
  id: string;
  title: string;
  color: string;
  deals: DealWithCustomer[];
  organizationId: string;
  userId: string;
}

export function PipelineColumn({
  id,
  title,
  color,
  deals,
  organizationId,
  userId,
}: PipelineColumnProps) {
  const columnId = useId();
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "column",
      id,
    },
  });

  // Memoize the deal IDs to prevent unnecessary re-renders
  const dealIds = useMemo(() => deals.map(d => d.id), [deals]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex w-72 flex-none flex-col rounded-xl border transition-colors",
        isOver && "border-primary/50 bg-primary/5 ring-2 ring-primary/30"
      )}
    >
      <div className="bg-card/95 sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-xl border-b px-3 py-2.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {deals.length}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        <SortableContext
          id={columnId}
          items={dealIds}
          strategy={verticalListSortingStrategy}
        >
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              organizationId={organizationId}
              userId={userId}
            />
          ))}

          {deals.length === 0 && (
            <div className="text-muted-foreground flex min-h-24 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs">
              Drop a deal here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
