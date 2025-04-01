"use client";

import { useState, useCallback, useMemo } from "react";
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
import type { Deal, DealFilters } from "~/types/crm";

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

interface DealBoardProps {
  deals: Deal[];
  filters: DealFilters;
  onDealUpdate: (deal: Deal) => void;
}

export function DealBoard({ deals, filters, onDealUpdate }: DealBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Apply filters to deals
  const filteredDeals = useMemo(() => {
    console.log("Filtering deals", deals.length);
    return deals.filter((deal) => {
      // Apply search filter
      if (
        filters.searchQuery &&
        !deal.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !deal.customerName
          .toLowerCase()
          .includes(filters.searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Apply value range filter
      if (
        filters.valueRange &&
        (deal.value < filters.valueRange[0] * 1000 ||
          deal.value > filters.valueRange[1] * 1000)
      ) {
        return false;
      }

      // Apply probability filter
      if (
        filters.probability &&
        deal.probability !== undefined &&
        (deal.probability < filters.probability[0] ||
          deal.probability > filters.probability[1])
      ) {
        return false;
      }

      return true;
    });
  }, [deals, filters]);

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
      return filteredDeals.filter((deal) => deal.status === columnId);
    },
    [filteredDeals],
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
      const overType = over.data?.current?.type as
        | "column"
        | "deal"
        | undefined;

      // If dropped on a column directly
      if (overType === "column") {
        const newStatus = overId as string;

        // If status has changed, update the deal
        if (activeDeal.status !== newStatus) {
          const updatedDeal = {
            ...activeDeal,
            status: newStatus,
            updatedAt: new Date().toISOString(),
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
            updatedAt: new Date().toISOString(),
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

    return <DealCard deal={deal} isOverlay onDealUpdate={onDealUpdate} />;
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
      <div className="hide-scrollbar flex h-auto min-h-[calc(100vh-350px)] overflow-x-auto pb-4">
        <div className="flex flex-wrap gap-4">
          {COLUMNS.map((column) => {
            const columnDeals = getColumnDeals(column.id);
            return (
              <PipelineColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                deals={columnDeals}
                onDealUpdate={onDealUpdate}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay>{getDragOverlay()}</DragOverlay>
    </DndContext>
  );
}
