// Finance-related types and helpers leveraging generated Zod schemas.
// We re-export Prisma-generated Zod types to maintain consistency while
// providing local fallbacks for create/update input schemas that are no longer generated.
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  InvoiceSchema,
  InvoiceItemSchema,
  PaymentSchema,
  InvoiceStatusSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
  type Invoice,
  type InvoiceItem,
  type Payment,
  type InvoiceStatusType,
} from "../../prisma/generated/zod";

export type { Invoice, InvoiceItem, Payment, InvoiceStatusType };

export {
  InvoiceSchema,
  InvoiceItemSchema,
  PaymentSchema,
  InvoiceStatusSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
};

export const InvoiceCreateInputSchema = z.custom<Prisma.InvoiceCreateInput>();
export const InvoiceUncheckedCreateInputSchema =
  z.custom<Prisma.InvoiceUncheckedCreateInput>();
export const InvoiceUpdateInputSchema = z.custom<Prisma.InvoiceUpdateInput>();
export const InvoiceUncheckedUpdateInputSchema =
  z.custom<Prisma.InvoiceUncheckedUpdateInput>();

export const InvoiceItemCreateInputSchema =
  z.custom<Prisma.InvoiceItemCreateInput>();
export const InvoiceItemUncheckedCreateInputSchema =
  z.custom<Prisma.InvoiceItemUncheckedCreateInput>();
export const InvoiceItemUpdateInputSchema =
  z.custom<Prisma.InvoiceItemUpdateInput>();
export const InvoiceItemUncheckedUpdateInputSchema =
  z.custom<Prisma.InvoiceItemUncheckedUpdateInput>();

export const PaymentCreateInputSchema = z.custom<Prisma.PaymentCreateInput>();
export const PaymentUncheckedCreateInputSchema =
  z.custom<Prisma.PaymentUncheckedCreateInput>();
export const PaymentUpdateInputSchema = z.custom<Prisma.PaymentUpdateInput>();
export const PaymentUncheckedUpdateInputSchema =
  z.custom<Prisma.PaymentUncheckedUpdateInput>();

// UI labels & colors for statuses
export const invoiceStatusLabels: Record<InvoiceStatusType, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PAID: "Paid",
  PARTIALLY_PAID: "Partially Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

export const invoiceStatusColors: Record<InvoiceStatusType, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  SENT: "bg-blue-100 text-blue-800 border-blue-200",
  VIEWED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-800 border-yellow-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-muted text-muted-foreground border-muted",
};

// Helper type for invoice with items and payments
export interface InvoiceWithRelations extends Invoice {
  items: InvoiceItem[];
  payments: Payment[];
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  customerEmail: string;
  status: InvoiceStatusType;
  issueDate: Date;
  dueDate: Date;
  totalAmount: unknown; // Prisma Decimal - treat as opaque
  paidAmount: unknown;
  currency: string;
}

export interface InvoiceClientProps {
  organizationId: string;
}

export interface InvoiceDialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export interface InvoiceCreateDialogProps extends InvoiceDialogBaseProps {
  onCreated?: () => void;
}

export interface InvoiceEditDialogProps extends InvoiceDialogBaseProps {
  invoiceId?: string;
  onUpdated?: () => void;
}

export interface InvoiceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  organizationId: string;
  onDeleted?: () => void;
}

export interface InvoiceSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  organizationId: string;
  onSent?: () => void;
}

export interface InvoiceItemFormValue {
  id?: string;
  description: string;
  quantity: string; // keep as string for input control; parse before submit
  unitPrice: string;
  taxRate: string; // percent
  discountRate: string; // percent
}
