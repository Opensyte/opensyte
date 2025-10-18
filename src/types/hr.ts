// HR-related types using generated Zod schemas from Prisma.
// We re-export base model schemas while providing local fallbacks for create/update inputs.
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  EmployeeSchema,
  EmployeeStatusSchema,
  PayrollSchema,
  PayrollStatusSchema,
  TimeOffSchema,
  TimeOffTypeSchema,
  TimeOffStatusSchema,
  PerformanceReviewSchema,
  ReviewStatusSchema,
  type Employee,
  type EmployeeStatusType,
  type Payroll,
  type PayrollStatusType,
  type TimeOff,
  type TimeOffTypeType,
  type TimeOffStatusType,
  type PerformanceReview,
  type ReviewStatusType,
} from "../../prisma/generated/zod";

export type {
  Employee,
  EmployeeStatusType,
  Payroll,
  PayrollStatusType,
  TimeOff,
  TimeOffTypeType,
  TimeOffStatusType,
  PerformanceReview,
  ReviewStatusType,
};

export {
  EmployeeSchema,
  EmployeeStatusSchema,
  PayrollSchema,
  PayrollStatusSchema,
  TimeOffSchema,
  TimeOffTypeSchema,
  TimeOffStatusSchema,
  PerformanceReviewSchema,
  ReviewStatusSchema,
};

export const EmployeeCreateInputSchema = z.custom<Prisma.EmployeeCreateInput>();
export const EmployeeUncheckedCreateInputSchema =
  z.custom<Prisma.EmployeeUncheckedCreateInput>();
export const EmployeeUpdateInputSchema = z.custom<Prisma.EmployeeUpdateInput>();
export const EmployeeUncheckedUpdateInputSchema =
  z.custom<Prisma.EmployeeUncheckedUpdateInput>();

export const PayrollCreateInputSchema = z.custom<Prisma.PayrollCreateInput>();
export const PayrollUncheckedCreateInputSchema =
  z.custom<Prisma.PayrollUncheckedCreateInput>();
export const PayrollUpdateInputSchema = z.custom<Prisma.PayrollUpdateInput>();
export const PayrollUncheckedUpdateInputSchema =
  z.custom<Prisma.PayrollUncheckedUpdateInput>();

export const TimeOffCreateInputSchema = z.custom<Prisma.TimeOffCreateInput>();
export const TimeOffUncheckedCreateInputSchema =
  z.custom<Prisma.TimeOffUncheckedCreateInput>();
export const TimeOffUpdateInputSchema = z.custom<Prisma.TimeOffUpdateInput>();
export const TimeOffUncheckedUpdateInputSchema =
  z.custom<Prisma.TimeOffUncheckedUpdateInput>();

export const PerformanceReviewCreateInputSchema =
  z.custom<Prisma.PerformanceReviewCreateInput>();
export const PerformanceReviewUncheckedCreateInputSchema =
  z.custom<Prisma.PerformanceReviewUncheckedCreateInput>();
export const PerformanceReviewUpdateInputSchema =
  z.custom<Prisma.PerformanceReviewUpdateInput>();
export const PerformanceReviewUncheckedUpdateInputSchema =
  z.custom<Prisma.PerformanceReviewUncheckedUpdateInput>();

// Additional HR utility types and constants

// TimeOff enum types (since not in Prisma yet)
export const TIME_OFF_TYPES = [
  "VACATION",
  "SICK",
  "PERSONAL",
  "BEREAVEMENT",
  "MATERNITY",
  "PATERNITY",
  "UNPAID",
] as const;

export const TIME_OFF_STATUSES = [
  "PENDING",
  "APPROVED",
  "DENIED",
  "CANCELLED",
] as const;

export type TimeOffType = (typeof TIME_OFF_TYPES)[number];
export type TimeOffStatus = (typeof TIME_OFF_STATUSES)[number];

// TimeOff Zod schemas
export const timeOffTypeSchema = z.enum(TIME_OFF_TYPES);
export const timeOffStatusSchema = z.enum(TIME_OFF_STATUSES);

// Extended TimeOff type with Employee relation
export interface TimeOffWithEmployee {
  id: string;
  type: TimeOffType;
  startDate: Date;
  endDate: Date;
  duration: number;
  reason?: string | null;
  status: TimeOffStatus;
  approvedById?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string | null;
    position?: string | null;
  };
}

// Filter types for TimeOff components
export type TimeOffStatusFilter = "all" | TimeOffStatus;
export type TimeOffTypeFilter = "all" | TimeOffType;

// TimeOff Component Props and Types
export interface TimeOffClientProps {
  organizationId: string;
}

export interface TimeOffCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: () => void;
}

export interface TimeOffEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  timeOffId?: string;
  onUpdated: () => void;
}

export interface TimeOffDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOff: TimeOffWithEmployee | null;
}

export interface TimeOffTableProps {
  data: TimeOffWithEmployee[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  userId: string;
  organizationId: string;
}

// Form validation schemas
export const createTimeOffSchema = z
  .object({
    employeeId: z.string().min(1, "Employee is required"),
    type: timeOffTypeSchema,
    startDate: z.date({
      required_error: "Start date is required",
    }),
    endDate: z.date({
      required_error: "End date is required",
    }),
    reason: z.string().optional(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

export const updateTimeOffSchema = z
  .object({
    type: timeOffTypeSchema,
    startDate: z.date({
      required_error: "Start date is required",
    }),
    endDate: z.date({
      required_error: "End date is required",
    }),
    reason: z.string().optional(),
    status: timeOffStatusSchema,
  })
  .refine(data => data.endDate >= data.startDate, {
    message: "End date must be after or equal to start date",
    path: ["endDate"],
  });

export type CreateTimeOffFormData = z.infer<typeof createTimeOffSchema>;
export type UpdateTimeOffFormData = z.infer<typeof updateTimeOffSchema>;

// Constants for filters
export const TIME_OFF_STATUS_FILTERS = ["all", ...TIME_OFF_STATUSES] as const;
export const TIME_OFF_TYPE_FILTERS = ["all", ...TIME_OFF_TYPES] as const;

// Employee status display labels
export const employeeStatusLabels = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  TERMINATED: "Terminated",
  PROBATION: "Probation",
} as const;

// Employee status colors for UI
export const employeeStatusColors = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  ON_LEAVE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  TERMINATED: "bg-red-100 text-red-800 border-red-200",
  PROBATION: "bg-blue-100 text-blue-800 border-blue-200",
} as const;

// Time off type labels
export const timeOffTypeLabels: Record<TimeOffType, string> = {
  VACATION: "Vacation",
  SICK: "Sick Leave",
  PERSONAL: "Personal",
  BEREAVEMENT: "Bereavement",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  UNPAID: "Unpaid Leave",
} as const;

// Time off status labels
export const timeOffStatusLabels: Record<TimeOffStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
} as const;

// Time off status colors
export const timeOffStatusColors: Record<TimeOffStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  DENIED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
} as const;

// Payroll status labels
export const payrollStatusLabels = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  PAID: "Paid",
  CANCELLED: "Cancelled",
} as const;

// Performance review status labels
export const reviewStatusLabels = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  COMPLETED: "Completed",
} as const;

// Extended Employee type with computed fields for UI
export type EmployeeWithComputedFields = Employee & {
  fullName: string;
  displayStatus: string;
  yearsOfService?: number;
  isOnProbation: boolean;
  isTerminated: boolean;
};

// Currencies (sourced from prisma folder)
export { currencies } from "./currencies";
export type { CurrencyCode } from "./currencies";
