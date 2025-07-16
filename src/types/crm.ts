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
