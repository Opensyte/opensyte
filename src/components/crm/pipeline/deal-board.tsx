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
    // Early return if no filters applied
    if (!filters.searchQuery && !filters.probability) {
      return localDeals;
    }

    return localDeals.filter(deal => {
      // Apply search filter with early return
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const titleMatch = deal.title.toLowerCase().includes(query);
        const customerMatch = deal.customerName.toLowerCase().includes(query);
        if (!titleMatch && !customerMatch) {
          return false;
        }
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
      // Minimal activation constraint for instant drag response
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize these functions to prevent recreation on each render
  const getColumnDeals = useCallback(
    (columnId: string): Deal[] => {
      return filteredDeals.filter(deal => deal.status === columnId);
    },
    [filteredDeals]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Clear active state immediately for instant visual feedback
      setActiveId(null);

      if (!over) {
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find the active deal from localDeals for current UI state
      const activeDeal = localDeals.find(deal => deal.id === activeId);
      if (!activeDeal) {
        return;
      }

      // Get the type and status from the over element
      const overType = over.data?.current?.type as
        | "column"
        | "deal"
        | undefined;
      let newStatus = activeDeal.status;

      // Determine new status based on drop target
      if (overType === "column") {
        newStatus = overId;
      } else if (overType === "deal") {
        // Find the target deal and use its status
        const overDeal = localDeals.find(deal => deal.id === overId);
        if (overDeal) {
          newStatus = overDeal.status;
        }
      }

      // Only proceed if status actually changed
      if (activeDeal.status === newStatus) {
        return;
      }

      // Create updated deal object
      const updatedDeal = {
        ...activeDeal,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      // INSTANT OPTIMISTIC UPDATE: Update local state immediately for instant visual feedback
      setLocalDeals(prevDeals =>
        prevDeals.map(deal => (deal.id === activeId ? updatedDeal : deal))
      );

      // Then call API in background
      onDealUpdate(updatedDeal);
    },
    [localDeals, onDealUpdate]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const getDragOverlay = useCallback(() => {
    if (!activeId) return null;

    const deal = localDeals.find(deal => deal.id === activeId);
    if (!deal) return null;

    return <DealCard deal={deal} isOverlay organizationId={organizationId} />;
  }, [activeId, localDeals, organizationId]);

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
          {COLUMNS.map(column => {
            const columnDeals = getColumnDeals(column.id);
            return (
              <PipelineColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                deals={columnDeals}
                organizationId={organizationId}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay>{getDragOverlay()}</DragOverlay>
    </DndContext>
  );
}
