"use client";

import { useEffect } from "react";
import { DealBoard } from "./deal-board";
import { DealFilters as DealFiltersComponent } from "./deal-filters";
import { usePipelineStore } from "~/store/crm/pipeline";
import type { Deal, DealFilters } from "~/types/crm";

export function Pipeline() {
  const {
    deals,
    loading,
    filters,
    setDeals,
    setLoading,
    setError,
    updateDeal,
    setFilters,
  } = usePipelineStore();

  // Handle deal updates
  const handleDealUpdate = (updatedDeal: Deal) => {
    updateDeal(updatedDeal);
  };

  // Apply filters helper
  const handleApplyFilters = (newFilters: Partial<DealFilters>) => {
    setFilters(newFilters);
  };

  // Load deals on mount if not already loaded
  useEffect(() => {
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
  }, [deals.length, loading, setDeals, setLoading, setError, deals]);

  // Calculate pipeline metrics
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const totalDeals = deals.length;
  const wonDeals = deals.filter((deal) => deal.status === "CLOSED_WON");
  const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);

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
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted-foreground">Loading deals...</div>
          </div>
        ) : (
          <DealBoard
            deals={deals}
            filters={filters}
            onDealUpdate={handleDealUpdate}
          />
        )}
      </div>
    </>
  );
}
