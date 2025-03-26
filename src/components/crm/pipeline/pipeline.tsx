"use client";

import { useState, useEffect, useCallback } from "react";
import { DealBoard } from "./deal-board";
import { DealFilters } from "./deal-filters";
import { getDeals, filterDeals } from "~/lib/sample-data";
import type { Deal, DealFilters as DealFiltersType } from "~/types/crm";

export function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<DealFiltersType>({
    dateRange: null,
    valueRange: null,
    probability: null,
  });

  // Load deals on mount
  useEffect(() => {
    const loadedDeals = getDeals();
    setDeals(loadedDeals);
    setFilteredDeals(loadedDeals);
  }, []);

  // Apply filters when deals, searchQuery or filters change
  useEffect(() => {
    const filtered = filterDeals({
      searchQuery,
      valueRange: filters.valueRange,
      probability: filters.probability,
      dealsArray: deals,
    });
    setFilteredDeals(filtered);
  }, [searchQuery, filters, deals]);

  // Handle deal updates - memoized to prevent recreation on every render
  const handleDealUpdate = useCallback((updatedDeal: Deal) => {
    setDeals(prevDeals => 
      prevDeals.map(deal => deal.id === updatedDeal.id ? updatedDeal : deal)
    );
  }, []);

  // Calculate pipeline metrics
  const totalValue = filteredDeals.reduce((sum, deal) => sum + deal.value, 0);
  const totalDeals = filteredDeals.length;
  const wonDeals = filteredDeals.filter((deal) => deal.status === "CLOSED_WON");
  const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <>
      {/* Pipeline metrics */}
      <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-4 md:px-6">
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

      <DealFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <DealBoard deals={filteredDeals} onDealUpdate={handleDealUpdate} />
      </div>
    </>
  );
}
