"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DealBoard } from "./deal-board";
import { DealFilters as DealFiltersComponent } from "./deal-filters";
import { PipelineSkeleton } from "./pipeline-skeleton";
import { api } from "~/trpc/react";
import type { Deal, DealFilters } from "~/types/crm";

interface PipelineProps {
  organizationId: string;
}

export function Pipeline({ organizationId }: PipelineProps) {
  const [filters, setFilters] = useState<
    DealFilters & { searchQuery?: string }
  >({
    dateRange: null,
    valueRange: null,
    probability: null,
    searchQuery: "",
  });

  // tRPC queries and mutations
  const utils = api.useUtils();
  const {
    data: deals = [],
    isLoading,
    error,
  } = api.dealsCrm.getDealsByOrganization.useQuery(
    { organizationId },
    {
      refetchOnWindowFocus: false,
      enabled: !!organizationId, // Only run query if organizationId is provided
    },
  );

  const updateDeal = api.dealsCrm.updateDeal.useMutation({
    onSuccess: async () => {
      toast.success("Deal updated successfully");
      await utils.dealsCrm.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update deal", {
        description: error.message,
      });
    },
  });

  // Handle deal updates
  const handleDealUpdate = (updatedDeal: Deal) => {
    updateDeal.mutate({
      id: updatedDeal.id,
      organizationId: organizationId,
      title: updatedDeal.title,
      value: Number(updatedDeal.value),
      customerId: updatedDeal.customerId,
      customerName: updatedDeal.customerName,
      status: updatedDeal.status as
        | "NEW"
        | "CONTACTED"
        | "QUALIFIED"
        | "PROPOSAL"
        | "NEGOTIATION"
        | "CLOSED_WON"
        | "CLOSED_LOST",
      stage: updatedDeal.stage,
      probability: updatedDeal.probability,
      expectedCloseDate: updatedDeal.expectedCloseDate
        ? new Date(updatedDeal.expectedCloseDate)
        : undefined,
      description: updatedDeal.description,
    });
  };

  // Apply filters helper
  const handleApplyFilters = (newFilters: Partial<DealFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  /* useEffect(() => {
    if (deals.length === 0 && !loading) {
      setLoading(true);
      try {
        // In a real app, this would be an API call
        setDeals(deals);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load deals";
        setError(errorMessage);
        console.error("Failed to load deals:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [deals.length, loading, setDeals, setLoading, setError, deals]); */

  // Calculate pipeline metrics
  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const totalDeals = deals.length;
  const wonDeals = deals.filter((deal) => deal.status === "CLOSED_WON");
  const wonValue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);

  // Transform deals data to match expected Deal type
  const transformedDeals: Deal[] = deals.map((deal) => ({
    ...deal,
    value: Number(deal.value),
    probability: deal.probability ?? undefined,
    description: deal.description ?? "",
    customerName: `${deal.customer.firstName} ${deal.customer.lastName}`,
    expectedCloseDate: deal.expectedCloseDate
      ? deal.expectedCloseDate.toISOString()
      : undefined,
    actualCloseDate: deal.actualCloseDate
      ? deal.actualCloseDate.toISOString()
      : undefined,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  }));

  return (
    <>
      {/* Pipeline metrics */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-4 md:px-6">
        <div className="bg-card rounded-lg border p-3 shadow-sm">
          <div className="text-muted-foreground text-sm">
            Total Pipeline Value
          </div>
          <div className="mt-1 text-2xl font-bold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalValue)}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-3 shadow-sm">
          <div className="text-muted-foreground text-sm">Total Deals</div>
          <div className="mt-1 text-2xl font-bold">{totalDeals}</div>
        </div>
        <div className="bg-card rounded-lg border p-3 shadow-sm">
          <div className="text-muted-foreground text-sm">Won Deals</div>
          <div className="mt-1 text-2xl font-bold">{wonDeals.length}</div>
        </div>
        <div className="bg-card rounded-lg border p-3 shadow-sm">
          <div className="text-muted-foreground text-sm">Closed Value</div>
          <div className="mt-1 text-2xl font-bold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(wonValue)}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 md:px-6">
        <DealFiltersComponent
          filters={filters}
          onApplyFilters={handleApplyFilters}
        />
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <PipelineSkeleton />
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-destructive">
              Failed to load deals: {error.message}
            </div>
          </div>
        ) : (
          <DealBoard
            deals={transformedDeals}
            filters={filters}
            organizationId={organizationId}
            onDealUpdate={handleDealUpdate}
          />
        )}
      </div>
    </>
  );
}
