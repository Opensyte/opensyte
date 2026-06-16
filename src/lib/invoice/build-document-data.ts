// Maps a persisted invoice (+ org settings) into the InvoiceDocument data shape.
// Shared by the PDF route handler, the email attachment renderer, and the public
// page so all three render from identical data. Type-only import of the document
// data shape keeps @react-pdf out of any client bundle that only needs the mapper.
import type { Invoice, InvoiceItem, InvoiceSettings } from "@prisma/client";
import type { InvoiceDocumentData } from "~/components/finance/invoicing/document/invoice-document";
import { balanceDue } from "./calc";

type Decimalish = { toString(): string };

export interface OrganizationBranding {
  name: string;
  logo: string | null;
  website: string | null;
}

export interface BuildDocumentInput {
  invoice: Invoice & { items: InvoiceItem[] };
  settings?: InvoiceSettings | null;
  organization?: OrganizationBranding | null;
}

function str(value: Decimalish | null | undefined): string {
  return value == null ? "0" : value.toString();
}

export function buildInvoiceDocumentData({
  invoice,
  settings,
  organization,
}: BuildDocumentInput): InvoiceDocumentData {
  const businessName =
    settings?.businessName ?? organization?.name ?? "Your Business";

  return {
    // From (business identity): invoice settings win, fall back to organization.
    businessName,
    businessEmail: settings?.businessEmail ?? null,
    businessPhone: settings?.businessPhone ?? null,
    businessAddress: settings?.businessAddress ?? null,
    businessWebsite: settings?.businessWebsite ?? organization?.website ?? null,
    logoUrl: invoice.logoUrl ?? settings?.logoUrl ?? organization?.logo ?? null,

    // Bill to (snapshotted on the invoice)
    customerName: invoice.customerName,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone,
    customerAddress: invoice.customerAddress,

    // Meta
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    locale: invoice.locale,
    paymentTerms: invoice.paymentTerms,
    taxRegistrationId: invoice.taxRegistrationId,

    // Line items (item.subtotal stores the line total = qty * unitPrice)
    items: invoice.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(item => ({
        description: item.description,
        quantity: str(item.quantity),
        unitPrice: str(item.unitPrice),
        lineTotal: str(item.subtotal),
      })),

    // Totals
    subtotal: str(invoice.subtotal),
    discountAmount: str(invoice.discountAmount),
    taxEnabled: invoice.taxEnabled,
    taxLabel: invoice.taxLabel,
    taxRate: str(invoice.taxRate),
    taxAmount: str(invoice.taxAmount),
    shippingAmount: str(invoice.shippingAmount),
    totalAmount: str(invoice.totalAmount),
    paidAmount: str(invoice.paidAmount),
    balanceDue: balanceDue(str(invoice.totalAmount), str(invoice.paidAmount)).toString(),

    // Extras
    paymentInstructions: invoice.paymentInstructions,
    notes: invoice.notes,
    termsAndConditions: invoice.termsAndConditions,
  };
}
