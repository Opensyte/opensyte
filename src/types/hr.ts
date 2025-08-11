// HR-related types using generated Zod schemas from Prisma
import type { Employee } from "../../prisma/generated/zod";

export {
  // Employee types
  type Employee,
  EmployeeSchema,
  type EmployeeStatusType,
  EmployeeStatusSchema,

  // Employee input schemas for forms
  EmployeeCreateInputSchema,
  EmployeeUncheckedCreateInputSchema,
  EmployeeUpdateInputSchema,
  EmployeeUncheckedUpdateInputSchema,

  // Payroll types
  type Payroll,
  PayrollSchema,
  type PayrollStatusType,
  PayrollStatusSchema,

  // Payroll input schemas
  PayrollCreateInputSchema,
  PayrollUncheckedCreateInputSchema,
  PayrollUpdateInputSchema,
  PayrollUncheckedUpdateInputSchema,

  // Time Off types
  type TimeOff,
  TimeOffSchema,
  type TimeOffTypeType,
  TimeOffTypeSchema,
  type TimeOffStatusType,
  TimeOffStatusSchema,

  // Time Off input schemas
  TimeOffCreateInputSchema,
  TimeOffUncheckedCreateInputSchema,
  TimeOffUpdateInputSchema,
  TimeOffUncheckedUpdateInputSchema,

  // Performance Review types
  type PerformanceReview,
  PerformanceReviewSchema,
  type ReviewStatusType,
  ReviewStatusSchema,

  // Performance Review input schemas
  PerformanceReviewCreateInputSchema,
  PerformanceReviewUncheckedCreateInputSchema,
  PerformanceReviewUpdateInputSchema,
  PerformanceReviewUncheckedUpdateInputSchema,
} from "../../prisma/generated/zod";

// Additional HR utility types and constants

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
export const timeOffTypeLabels = {
  VACATION: "Vacation",
  SICK: "Sick Leave",
  PERSONAL: "Personal",
  BEREAVEMENT: "Bereavement",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  UNPAID: "Unpaid Leave",
} as const;

// Time off status labels
export const timeOffStatusLabels = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
} as const;

// Time off status colors
export const timeOffStatusColors = {
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
