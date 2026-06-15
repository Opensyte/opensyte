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
import type { DealWithCustomer, DealFilters } from "~/types/crm";

interface Column {
  id: string;
  title: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: "IDENTIFIED", title: "Identified", color: "bg-blue-500" },
  { id: "CONNECTION_SENT", title: "Connection Sent", color: "bg-sky-500" },
  { id: "CONNECTED", title: "Connected", color: "bg-indigo-500" },
  { id: "MESSAGED", title: "Messaged", color: "bg-violet-500" },
  { id: "IN_CONVERSATION", title: "In Conversation", color: "bg-purple-500" },
  { id: "CALL_BOOKED", title: "Call Booked", color: "bg-amber-500" },
  { id: "PROPOSAL_SENT", title: "Proposal Sent", color: "bg-orange-500" },
  { id: "WON", title: "Won", color: "bg-green-500" },
  { id: "LOST", title: "Lost", color: "bg-red-500" },
];

interface DealBoardProps {
  deals: DealWithCustomer[];
  filters: DealFilters;
  organizationId: string;
  userId: string;
  onDealUpdate: (deal: DealWithCustomer) => void;
}

export function DealBoard({
  deals,
  filters,
  organizationId,
  userId,
  onDealUpdate,
}: DealBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Deals come from the react-query cache, which the parent updates
  // optimistically on drop — so we render straight from props.
  const filteredDeals = useMemo(() => {
    // Early return if no filters applied
    if (!filters.searchQuery && !filters.probability) {
      return deals;
    }

    return deals.filter(deal => {
      // Apply search filter with early return
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const titleMatch = deal.title.toLowerCase().includes(query);
        const customerName =
          `${deal.customer?.firstName ?? ""} ${deal.customer?.lastName ?? ""}`.trim();
        const customerMatch = customerName.toLowerCase().includes(query);
        if (!titleMatch && !customerMatch) {
          return false;
        }
      }

      // Apply probability filter
      if (
        filters.probability &&
        deal.probability !== null &&
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
    (columnId: string): DealWithCustomer[] => {
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

      const activeDeal = deals.find(deal => deal.id === activeId);
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
        newStatus = overId as typeof activeDeal.status;
      } else if (overType === "deal") {
        // Find the target deal and use its status
        const overDeal = deals.find(deal => deal.id === overId);
        if (overDeal) {
          newStatus = overDeal.status;
        }
      }

      // Only proceed if status actually changed
      if (activeDeal.status === newStatus) {
        return;
      }

      // Hand off to the parent, which updates the react-query cache
      // optimistically (instant move) and rolls back if the request fails.
      onDealUpdate({
        ...activeDeal,
        status: newStatus,
        updatedAt: new Date(),
      });
    },
    [deals, onDealUpdate]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const getDragOverlay = useCallback(() => {
    if (!activeId) return null;

    const deal = deals.find(deal => deal.id === activeId);
    if (!deal) return null;

    return (
      <DealCard
        deal={deal}
        isOverlay
        organizationId={organizationId}
        userId={userId}
      />
    );
  }, [activeId, deals, organizationId, userId]);

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
        <div className="flex items-stretch gap-4">
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
                userId={userId}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay>{getDragOverlay()}</DragOverlay>
    </DndContext>
  );
}
