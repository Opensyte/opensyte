// Financial reporting types and helpers
import type {
  FinancialReportType,
  FinancialReportStatus,
  FinancialReportExportFormat,
  FinancialReportScheduleFrequency,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  FinancialReportType,
  FinancialReportStatus,
  FinancialReportExportFormat,
  FinancialReportScheduleFrequency,
} from "@prisma/client";

// UI labels for financial report types
export const financialReportTypeLabels: Record<FinancialReportType, string> = {
  INCOME_STATEMENT: "Income Statement",
  BALANCE_SHEET: "Balance Sheet",
  CASH_FLOW: "Cash Flow Statement",
  EXPENSE_REPORT: "Expense Report",
  PROFIT_LOSS: "Profit & Loss",
  CUSTOM: "Custom Report",
};

// UI labels for report status
export const financialReportStatusLabels: Record<
  FinancialReportStatus,
  string
> = {
  DRAFT: "Draft",
  GENERATING: "Generating",
  COMPLETED: "Completed",
  FAILED: "Failed",
  ARCHIVED: "Archived",
};

// UI colors for report status
export const financialReportStatusColors: Record<
  FinancialReportStatus,
  string
> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  GENERATING: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  ARCHIVED: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

// Export format labels
export const exportFormatLabels: Record<FinancialReportExportFormat, string> = {
  PDF: "PDF Document",
  EXCEL: "Excel Spreadsheet",
  CSV: "CSV File",
  JSON: "JSON Data",
};

// Schedule frequency labels
export const scheduleFrequencyLabels: Record<
  FinancialReportScheduleFrequency,
  string
> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

// Date range presets
export const dateRangePresets = [
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Quarter", value: "thisQuarter" },
  { label: "Last Quarter", value: "lastQuarter" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "Year to Date", value: "yearToDate" },
  { label: "Custom Range", value: "custom" },
] as const;

export type DateRangePreset = (typeof dateRangePresets)[number]["value"];

// Financial report filter types
export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportFilters {
  dateRange: ReportDateRange;
  includeArchived?: boolean;
  categories?: string[];
  vendors?: string[];
}

export type ReportTemplate = Record<string, unknown>;

// Component prop interfaces
export interface FinancialReportsClientProps {
  organizationId: string;
}

export interface ReportDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export interface ReportCreateDialogProps extends ReportDialogBaseProps {
  onCreated?: () => void;
}

export interface ReportEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    id: string;
    name: string;
    type: FinancialReportType;
    status: FinancialReportStatus;
    filters: ReportFilters | null;
    template: ReportTemplate | null;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  onUpdated?: () => void;
}

export interface ReportDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId?: string;
  organizationId: string;
  onDeleted?: () => void;
}

export interface ReportViewDialogProps extends ReportDialogBaseProps {
  reportId?: string;
}

export interface ReportExportDialogProps extends ReportDialogBaseProps {
  reportId?: string;
  onExported?: () => void;
}
