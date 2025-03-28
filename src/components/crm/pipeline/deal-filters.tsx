"use client";

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
import type { DealFilters as DealFiltersType } from "~/types/crm";

interface DealFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: DealFiltersType;
  onFiltersChange: (filters: DealFiltersType) => void;
}

export function DealFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
}: DealFiltersProps) {
  const handleFilterChange = (
    key: keyof DealFiltersType,
    value: DealFiltersType[keyof DealFiltersType],
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleSliderChange = (
    key: "valueRange" | "probability",
    values: [number, number],
  ) => {
    const first = values[0];
    const second = values[1];
    // Type guard to ensure both values are defined numbers
    if (typeof first !== "number" || typeof second !== "number") return;
    handleFilterChange(key, values)
  };

  return (
    <div className="bg-background sticky top-0 z-10 border-b">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Search deals..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Value Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="leading-none font-medium">Deal Value</h4>
                  <p className="text-muted-foreground text-sm">
                    Filter deals by their value range
                  </p>
                </div>
                <div className="space-y-4 px-1">
                  <Slider
                    defaultValue={[0, 100]}
                    max={100}
                    step={1}
                    value={filters.valueRange ?? [0, 100]}
                    onValueChange={(values: [number, number]) =>
                      handleSliderChange("valueRange", values)
                    }
                  />
                  <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                    <span>$0</span>
                    <span>$100k+</span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

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
                    onValueChange={(values: [number, number]) =>
                      handleSliderChange("probability", values)
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

          <Button
            variant="outline"
            onClick={() => {
              onFiltersChange({
                dateRange: null,
                valueRange: null,
                probability: null,
              });
            }}
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
