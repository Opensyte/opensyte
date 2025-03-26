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
