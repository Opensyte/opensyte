// NOTE: If a type already exists in Prisma, do not redefine it here.
// Always use the Prisma types directly to maintain consistency.

import type { Deal } from "@prisma/client";

// Re-export Prisma types for easier imports
export type { Deal } from "@prisma/client";

// Extended Deal type with customer relationship data (as returned by API)
export type DealWithCustomer = Deal & {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    email: string | null;
  };
};

export interface DealFilters {
  dateRange: null | [Date, Date];
  valueRange: null | [number, number];
  probability: null | [number, number];
  searchQuery?: string;
}

export type DealUpdateFunction = (deal: Deal) => void;

export interface PipelineMetrics {
  totalValue: number;
  totalDeals: number;
  wonDeals: Deal[];
  wonValue: number;
}

// Interaction Color Mappings
export const interactionTypeColors = {
  CALL: "bg-blue-100 text-blue-800 border-blue-200",
  EMAIL: "bg-green-100 text-green-800 border-green-200",
  MEETING: "bg-purple-100 text-purple-800 border-purple-200",
  NOTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  TASK: "bg-red-100 text-red-800 border-red-200",
} as const;

export const interactionTypeDotColors = {
  CALL: "bg-blue-500",
  EMAIL: "bg-green-500",
  MEETING: "bg-purple-500",
  NOTE: "bg-yellow-500",
  TASK: "bg-red-500",
} as const;

export const interactionTypeLabels = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  TASK: "Task",
} as const;

// Lead Status Colors
export const leadStatusColors = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  QUALIFIED: "bg-green-100 text-green-800",
  PROPOSAL: "bg-purple-100 text-purple-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  CLOSED_WON: "bg-emerald-100 text-emerald-800",
  CLOSED_LOST: "bg-red-100 text-red-800",
} as const;

export const leadStatusLabels = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
} as const;
