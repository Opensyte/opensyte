import type { Customer as PrismaCustomer } from "@prisma/client";

// Re-export the Prisma Customer type with proper date handling
export type Customer = Omit<PrismaCustomer, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

export interface Deal {
  id: string;
  title: string;
  value: number;
  customerName: string;
  customerId: string;
  status: string;
  stage: number;
  probability?: number;
  currency?: string;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

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

export type InteractionType = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK";
export type InteractionMedium =
  | "IN_PERSON"
  | "PHONE"
  | "VIDEO"
  | "EMAIL"
  | "CHAT"
  | "OTHER";

export interface CustomerInteraction {
  id: string;
  customerId: string;
  type: InteractionType;
  medium: InteractionMedium;
  subject?: string;
  content?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  createdById?: string;
  createdAt: Date;
  updatedAt: Date;
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
