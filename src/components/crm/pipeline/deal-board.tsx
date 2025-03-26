"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { PipelineColumn } from "./pipeline-column";
import { DealCard } from "./deal-card";
import type { Deal, DealUpdateFunction } from "~/types/crm";

interface DealBoardProps {
  deals: Deal[];
  onDealUpdate: DealUpdateFunction;
}

interface Column {
  id: string;
  title: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: "NEW", title: "New Leads", color: "bg-blue-500" },
  { id: "CONTACTED", title: "Contacted", color: "bg-purple-500" },
  { id: "QUALIFIED", title: "Qualified", color: "bg-indigo-500" },
  { id: "PROPOSAL", title: "Proposal", color: "bg-yellow-500" },
  { id: "NEGOTIATION", title: "Negotiation", color: "bg-orange-500" },
  { id: "CLOSED_WON", title: "Closed Won", color: "bg-green-500" },
  { id: "CLOSED_LOST", title: "Closed Lost", color: "bg-red-500" },
];

export function DealBoard({ deals, onDealUpdate }: DealBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Lowering the activation constraint for better mobile experience
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Memoize these functions to prevent recreation on each render
  const getColumnDeals = useCallback(
    (columnId: string): Deal[] => {
      return deals.filter((deal) => deal.status === columnId);
    },
    [deals],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) return;

      const activeId = active.id;
      const overId = over.id;

      // Find the active deal
      const activeDeal = deals.find((deal) => deal.id === activeId);
      if (!activeDeal) return;

      // Get the type and status from the over element
      const overType = over.data?.current?.type as 'column' | 'deal' | undefined;

      // If dropped on a column directly
      if (overType === "column") {
        const newStatus = overId as string;

        // If status has changed, update the deal
        if (activeDeal.status !== newStatus) {
          const updatedDeal = {
            ...activeDeal,
            status: newStatus,
          };
          onDealUpdate(updatedDeal);
        }
      }
      // If dropped on another deal
      else if (overType === "deal") {
        // Find the target deal
        const overDeal = deals.find((deal) => deal.id === overId);
        if (!overDeal) return;

        // Use the target deal's status for the active deal
        const newStatus = overDeal.status;

        // If status has changed, update the deal
        if (activeDeal.status !== newStatus) {
          const updatedDeal = {
            ...activeDeal,
            status: newStatus,
          };
          onDealUpdate(updatedDeal);
        }
      }

      setActiveId(null);
    },
    [deals, onDealUpdate],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const getDragOverlay = useCallback(() => {
    if (!activeId) return null;

    const deal = deals.find((deal) => deal.id === activeId);
    if (!deal) return null;

    return <DealCard deal={deal} onUpdate={onDealUpdate} isOverlay />;
  }, [activeId, deals, onDealUpdate]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="hide-scrollbar flex h-auto min-h-[calc(100vh-200px)] overflow-x-auto pb-4">
        <div className="flex flex-wrap gap-4">
          {COLUMNS.map((column) => (
            <PipelineColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              deals={getColumnDeals(column.id)}
              onDealUpdate={onDealUpdate}
            />
          ))}
        </div>
      </div>
      <DragOverlay>{getDragOverlay()}</DragOverlay>
    </DndContext>
  );
}
