"use client";

import { useId, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DealCard } from "./deal-card";
import type { Deal } from "~/types/crm";

interface PipelineColumnProps {
  id: string;
  title: string;
  color: string;
  deals: Deal[];
  organizationId: string;
}

export function PipelineColumn({
  id,
  title,
  color,
  deals,
  organizationId,
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
      className={`border-border bg-card flex w-72 flex-none flex-col rounded-lg border shadow-sm ${
        isOver ? "ring-primary ring-2" : ""
      }`}
      ref={setNodeRef}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between rounded-t-lg border-b p-3">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${color}`} />
          <h3 className="font-medium">{title}</h3>
          <div className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
            {deals.length}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <SortableContext
          id={columnId}
          items={dealIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {deals.map(deal => (
              <DealCard
                key={deal.id}
                deal={deal}
                organizationId={organizationId}
              />
            ))}

            {deals.length === 0 && (
              <div className="text-muted-foreground flex h-20 items-center justify-center rounded-md border border-dashed p-4 text-center text-sm">
                No deals in this stage
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
