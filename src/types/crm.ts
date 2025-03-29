import type { LeadSource, LeadStatus } from "./crm-enums";

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
}

export type DealUpdateFunction = (deal: Deal) => void;

export interface PipelineMetrics {
  totalValue: number;
  totalDeals: number;
  wonDeals: Deal[];
  wonValue: number;
}

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
  position?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  status?: LeadStatus;
  source?: LeadSource;
};

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
