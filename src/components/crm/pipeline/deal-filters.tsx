"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Slider } from "~/components/ui/slider";
import { SlidersHorizontal } from "lucide-react";
import type { DealFilters } from "~/types/crm";

interface DealFiltersProps {
  filters: DealFilters;
  onApplyFilters: (filters: Partial<DealFilters>) => void;
}

export function DealFilters({ filters, onApplyFilters }: DealFiltersProps) {
  const handleFilterChange = useCallback(
    <K extends keyof DealFilters>(key: K, value: DealFilters[K]) => {
      onApplyFilters({
        [key]: value,
      });
    },
    [onApplyFilters]
  );

  const handleSliderChange = useCallback(
    (key: "valueRange" | "probability", values: [number, number]) => {
      const first = values[0];
      const second = values[1];
      // Type guard to ensure both values are defined numbers
      if (typeof first !== "number" || typeof second !== "number") return;

      // Prevent unnecessary updates if values haven't actually changed
      const currentValues = filters[key];
      if (
        currentValues &&
        currentValues[0] === first &&
        currentValues[1] === second
      ) {
        return;
      }

      handleFilterChange(key, values);
    },
    [filters, handleFilterChange]
  );

  const handleResetFilters = useCallback(() => {
    onApplyFilters({
      dateRange: null,
      valueRange: null,
      probability: null,
      searchQuery: "",
    });
  }, [onApplyFilters]);

  return (
    <div className="bg-background sticky top-0 z-10 border-b">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search deals..."
            className="pl-8"
            value={filters.searchQuery ?? ""}
            onChange={e => handleFilterChange("searchQuery", e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Probability
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="leading-none font-medium">Win Probability</h4>
                  <p className="text-muted-foreground text-sm">
                    Filter deals by their probability of closing
                  </p>
                </div>
                <div className="space-y-4 px-1">
                  <Slider
                    defaultValue={[0, 100]}
                    max={100}
                    step={1}
                    value={filters.probability ?? [0, 100]}
                    onValueChange={values =>
                      handleSliderChange(
                        "probability",
                        values as [number, number]
                      )
                    }
                  />
                  <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
