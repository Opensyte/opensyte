"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
  organizationId: string;
  onDealUpdate: (deal: Deal) => void;
}

export function DealBoard({
  deals,
  filters,
  organizationId,
  onDealUpdate,
}: DealBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Local deals state for optimistic UI updates
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals);

  // Update local deals when props change (only if not currently dragging)
  useEffect(() => {
    if (!activeId) {
      setLocalDeals(deals);
    }
  }, [deals, activeId]);
  // Apply filters to deals (using localDeals for optimistic UI)
  const filteredDeals = useMemo(() => {
    console.log("Filtering deals", localDeals.length);
    return localDeals.filter((deal) => {
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
  }, [localDeals, filters]);

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

      if (!over) {
        setActiveId(null);
        return;
      }

      const activeId = active.id;
      const overId = over.id;

      // Find the active deal from localDeals for current UI state
      const activeDeal = localDeals.find((deal) => deal.id === activeId);
      if (!activeDeal) {
        setActiveId(null);
        return;
      }

      // Get the type and status from the over element
      const overType = over.data?.current?.type as
        | "column"
        | "deal"
        | undefined;

      let newStatus = activeDeal.status;

      // If dropped on a column directly
      if (overType === "column") {
        newStatus = overId as string;
      }
      // If dropped on another deal
      else if (overType === "deal") {
        // Find the target deal
        const overDeal = localDeals.find((deal) => deal.id === overId);
        if (!overDeal) {
          setActiveId(null);
          return;
        }

        // Use the target deal's status for the active deal
        newStatus = overDeal.status;
      }

      // Clear active state immediately
      setActiveId(null);

      // If status has changed, update the deal
      if (activeDeal.status !== newStatus) {
        // INSTANT OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
        const updatedDeal = {
          ...activeDeal,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };

        // Update local state first for instant visual feedback
        setLocalDeals((prevDeals) =>
          prevDeals.map((deal) =>
            deal.id === activeDeal.id ? updatedDeal : deal,
          ),
        );

        onDealUpdate(updatedDeal);
      }
    },
    [localDeals, onDealUpdate],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const getDragOverlay = useCallback(() => {
    if (!activeId) return null;

    const deal = localDeals.find((deal) => deal.id === activeId);
    if (!deal) return null;

    return (
      <DealCard
        deal={deal}
        isOverlay
        organizationId={organizationId}
        onDealUpdate={onDealUpdate}
      />
    );
  }, [activeId, localDeals, organizationId, onDealUpdate]);

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
                organizationId={organizationId}
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
