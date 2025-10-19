// Expense-related types and helpers leveraging generated Zod schemas.
// We re-export Prisma-generated Zod types to maintain consistency while
// providing local fallbacks for create/update input schemas that are no longer generated.
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  ExpenseSchema,
  ExpenseCategorySchema,
  ExpenseTagSchema,
  ExpenseStatusSchema,
  PaymentMethodSchema,
  type Expense,
  type ExpenseCategory,
  type ExpenseTag,
  type ExpenseStatusType,
  type PaymentMethodType,
} from "../../prisma/generated/zod";

export type {
  Expense,
  ExpenseCategory,
  ExpenseTag,
  ExpenseStatusType,
  PaymentMethodType,
};

export {
  ExpenseSchema,
  ExpenseCategorySchema,
  ExpenseTagSchema,
  ExpenseStatusSchema,
  PaymentMethodSchema,
};

export const ExpenseCreateInputSchema = z.custom<Prisma.ExpenseCreateInput>();
export const ExpenseUncheckedCreateInputSchema =
  z.custom<Prisma.ExpenseUncheckedCreateInput>();
export const ExpenseUpdateInputSchema = z.custom<Prisma.ExpenseUpdateInput>();
export const ExpenseUncheckedUpdateInputSchema =
  z.custom<Prisma.ExpenseUncheckedUpdateInput>();

export const ExpenseCategoryCreateInputSchema =
  z.custom<Prisma.ExpenseCategoryCreateInput>();
export const ExpenseCategoryUncheckedCreateInputSchema =
  z.custom<Prisma.ExpenseCategoryUncheckedCreateInput>();
export const ExpenseCategoryUpdateInputSchema =
  z.custom<Prisma.ExpenseCategoryUpdateInput>();
export const ExpenseCategoryUncheckedUpdateInputSchema =
  z.custom<Prisma.ExpenseCategoryUncheckedUpdateInput>();

export const ExpenseTagCreateInputSchema =
  z.custom<Prisma.ExpenseTagCreateInput>();
export const ExpenseTagUncheckedCreateInputSchema =
  z.custom<Prisma.ExpenseTagUncheckedCreateInput>();

// UI labels & colors for expense statuses
export const expenseStatusLabels: Record<ExpenseStatusType, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
  REIMBURSED: "Reimbursed",
};

export const expenseStatusColors: Record<ExpenseStatusType, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  PAID: "bg-indigo-100 text-indigo-800 border-indigo-200",
  REIMBURSED: "bg-purple-100 text-purple-800 border-purple-200",
};

// Payment method labels & colors
export const paymentMethodLabels: Record<PaymentMethodType, string> = {
  CREDIT_CARD: "Credit Card",
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
  CHECK: "Check",
  PAYPAL: "PayPal",
  STRIPE: "Stripe",
  OTHER: "Other",
};

export const paymentMethodColors: Record<PaymentMethodType, string> = {
  CREDIT_CARD: "bg-blue-100 text-blue-800 border-blue-200",
  BANK_TRANSFER: "bg-green-100 text-green-800 border-green-200",
  CASH: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CHECK: "bg-orange-100 text-orange-800 border-orange-200",
  PAYPAL: "bg-indigo-100 text-indigo-800 border-indigo-200",
  STRIPE: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

// Default expense categories
export const DEFAULT_EXPENSE_CATEGORIES = [
  {
    name: "Travel",
    description: "Business travel expenses",
    color: "bg-blue-100 text-blue-800",
  },
  {
    name: "Meals",
    description: "Business meals and entertainment",
    color: "bg-green-100 text-green-800",
  },
  {
    name: "Office Supplies",
    description: "Office materials and supplies",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    name: "Software",
    description: "Software licenses and subscriptions",
    color: "bg-purple-100 text-purple-800",
  },
  {
    name: "Marketing",
    description: "Marketing and advertising expenses",
    color: "bg-pink-100 text-pink-800",
  },
  {
    name: "Professional Services",
    description: "Consulting and professional fees",
    color: "bg-indigo-100 text-indigo-800",
  },
  {
    name: "Equipment",
    description: "Equipment purchases and rentals",
    color: "bg-red-100 text-red-800",
  },
  {
    name: "Training",
    description: "Training and education expenses",
    color: "bg-orange-100 text-orange-800",
  },
] as const;

// Helper types for expense with relations
export interface ExpenseWithRelations extends Expense {
  category?: ExpenseCategory | null;
  tags?: ExpenseTag[];
  project?: { id: string; name: string } | null;
}

export interface ExpenseListItem {
  id: string;
  amount: unknown; // Prisma Decimal - treat as opaque
  currency: string;
  date: Date;
  description?: string | null;
  status: ExpenseStatusType;
  category?: { name: string; color: string } | null;
  customCategory?: string | null;
  vendor?: string | null;
  paymentMethod: PaymentMethodType;
  reimbursable: boolean;
  createdAt: Date;
}

export interface ExpenseFormData {
  amount: string;
  currency: string;
  date: Date;
  description?: string;
  categoryId?: string;
  customCategory?: string;
  vendor?: string;
  paymentMethod: PaymentMethodType;
  status: ExpenseStatusType;
  projectId?: string;
  reimbursable: boolean;
  receipt?: string;
  notes?: string;
  tagIds?: string[];
}

export interface ExpenseClientProps {
  organizationId: string;
}

export interface ExpenseDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export interface ExpenseCreateDialogProps extends ExpenseDialogBaseProps {
  onCreated?: () => void;
}

export interface ExpenseEditDialogProps extends ExpenseDialogBaseProps {
  expenseId?: string;
  onUpdated?: () => void;
}

export interface ExpenseDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId?: string;
  organizationId: string;
  onDeleted?: () => void;
}

export interface ExpenseApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId?: string;
  organizationId: string;
  onProcessed?: () => void;
}

export interface ExpenseFilters {
  status?: ExpenseStatusType[];
  categoryId?: string[];
  paymentMethod?: PaymentMethodType[];
  projectId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  reimbursable?: boolean;
}

// Summary statistics types
export interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  pendingApproval: number;
  pendingReimbursement: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}
