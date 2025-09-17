"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Printer,
  Download,
  Send,
  User,
  Calendar,
  DollarSign,
  FileText,
  Building,
} from "lucide-react";
import { invoiceStatusColors, invoiceStatusLabels } from "~/types";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
  organizationId: string;
  onSendEmail?: (invoiceId: string) => void;
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  taxRate: unknown;
  discountRate: unknown;
}

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  invoiceId,
  onSendEmail,
}: InvoicePreviewDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    data: invoice,
    isLoading,
    error,
  } = api.invoice.getInvoiceById.useQuery(
    { id: invoiceId! },
    { enabled: !!invoiceId && open }
  );

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const handleDownload = () => {
    if (!invoice) return;

    // Create a simplified HTML version for download
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatAmount = (value: unknown, currency?: string): string => {
    let numericValue: number;

    if (typeof value === "number") {
      numericValue = value;
    } else if (typeof value === "string") {
      numericValue = parseFloat(value);
      if (isNaN(numericValue)) return value;
    } else if (value && typeof value === "object" && "toString" in value) {
      try {
        numericValue = parseFloat((value as { toString(): string }).toString());
        if (isNaN(numericValue))
          return (value as { toString(): string }).toString();
      } catch {
        return "0";
      }
    } else {
      return "0";
    }

    // Format based on currency
    const currencyCode = currency ?? "USD";

    // IDR doesn't use decimal places and uses thousands separators
    if (currencyCode === "IDR") {
      return new Intl.NumberFormat("id-ID").format(Math.round(numericValue));
    }

    // For other currencies, use 2 decimal places with appropriate locale
    const locale = currencyCode === "USD" ? "en-US" : "en-US"; // Can be extended for other currencies
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  const formatDate = (value: unknown): string => {
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleDateString();
    }
    return "";
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const quantity =
      typeof item.quantity === "number"
        ? item.quantity
        : parseFloat(
            (item.quantity as { toString(): string })?.toString() ?? "0"
          );
    const unitPrice =
      typeof item.unitPrice === "number"
        ? item.unitPrice
        : parseFloat(
            (item.unitPrice as { toString(): string })?.toString() ?? "0"
          );
    const subtotal = quantity * unitPrice;
    const discount =
      subtotal *
      (parseFloat(
        (item.discountRate as { toString(): string })?.toString() ?? "0"
      ) /
        100);
    const afterDiscount = subtotal - discount;
    const tax =
      afterDiscount *
      (parseFloat((item.taxRate as { toString(): string })?.toString() ?? "0") /
        100);
    return afterDiscount + tax;
  };

  const generateInvoiceHTML = () => {
    if (!invoice) return "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
            .org-info { display: flex; align-items: center; gap: 15px; }
            .org-logo { width: 80px; height: 80px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; }
            .org-placeholder { width: 80px; height: 80px; background-color: #f0f0f0; border: 1px solid #ddd; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #666; }
            .invoice-title { text-align: center; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="org-info">
              ${
                invoice.organization?.logo
                  ? `<img src="${invoice.organization.logo}" alt="${invoice.organization.name ?? "Organization"}" class="org-logo" />`
                  : `<div class="org-placeholder">🏢</div>`
              }
              <div>
                <h3 style="margin: 0; color: #666;">${invoice.organization?.name ?? "Organization"}</h3>
                ${invoice.organization?.website ? `<p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">${invoice.organization.website}</p>` : ""}
              </div>
            </div>
            <div class="invoice-title">
              <h1 style="margin: 0; color: #333;">INVOICE</h1>
              <h2 style="margin: 5px 0 0 0; color: #666;">${invoice.invoiceNumber}</h2>
            </div>
          </div>
          
          <div class="invoice-info">
            <div>
              <strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}<br>
              <strong>Due Date:</strong> ${formatDate(invoice.dueDate)}<br>
              <strong>Payment Terms:</strong> ${invoice.paymentTerms}
            </div>
            <div>
              <strong>Status:</strong> ${invoiceStatusLabels[invoice.status]}<br>
              <strong>Currency:</strong> ${invoice.currency}
            </div>
          </div>

          <div class="customer-info">
            <strong>Bill To:</strong><br>
            ${invoice.customerName ?? `${invoice.customer?.firstName ?? ""} ${invoice.customer?.lastName ?? ""}`.trim()}<br>
            ${invoice.customerEmail}<br>
            ${invoice.customer?.address ?? ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Tax Rate</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items
                .map(
                  item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${formatAmount(item.quantity)}</td>
                  <td>${formatAmount(item.unitPrice, invoice.currency)} ${invoice.currency}</td>
                  <td>${formatAmount(item.discountRate)}%</td>
                  <td>${formatAmount(item.taxRate)}%</td>
                  <td class="text-right">${formatAmount(calculateItemTotal(item), invoice.currency)} ${invoice.currency}</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td colspan="5"><strong>Total Amount</strong></td>
                <td class="text-right"><strong>${formatAmount(invoice.totalAmount, invoice.currency)} ${invoice.currency}</strong></td>
              </tr>
            </tbody>
          </table>

          ${invoice.notes ? `<div><strong>Notes:</strong><br>${invoice.notes}</div>` : ""}
          ${invoice.termsAndConditions ? `<div><strong>Terms & Conditions:</strong><br>${invoice.termsAndConditions}</div>` : ""}
        </body>
      </html>
    `;
  };

  if (!open || !invoiceId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto p-6 lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Preview
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-600">
            Failed to load invoice. Please try again.
          </div>
        ) : !invoice ? (
          <div className="py-8 text-center text-muted-foreground">
            Invoice not found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting}
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? "Printing..." : "Print"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {onSendEmail && invoice.customerEmail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendEmail(invoice.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              )}
            </div>

            {/* Invoice Header */}
            <div className="flex items-center justify-between border-b pb-6">
              {/* Organization Logo */}
              <div className="flex items-center gap-4">
                {invoice.organization?.logo ? (
                  <Image
                    src={invoice.organization.logo}
                    alt={invoice.organization.name ?? "Organization"}
                    width={80}
                    height={80}
                    className="object-contain rounded-lg border"
                  />
                ) : (
                  <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center border">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    {invoice.organization?.name ?? "Organization"}
                  </h3>
                  {invoice.organization?.website && (
                    <p className="text-sm text-muted-foreground">
                      {invoice.organization.website}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice Title */}
              <div className="text-center">
                <h1 className="text-3xl font-bold text-primary mb-2">
                  INVOICE
                </h1>
                <h2 className="text-xl font-semibold text-muted-foreground">
                  {invoice.invoiceNumber}
                </h2>
              </div>
            </div>

            {/* Invoice Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Issue Date:</span>
                  <span>{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Due Date:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Payment Terms:</span>
                  <span>{invoice.paymentTerms}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge
                    variant="outline"
                    className={invoiceStatusColors[invoice.status]}
                  >
                    {invoiceStatusLabels[invoice.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Currency:</span>
                  <span>{invoice.currency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Paid Amount:</span>
                  <span>
                    {formatAmount(invoice.paidAmount, invoice.currency)}{" "}
                    {invoice.currency}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Bill To</h3>
              </div>
              <div className="pl-7 space-y-2">
                <p className="font-medium">
                  {invoice.customerName ??
                    `${invoice.customer?.firstName ?? ""} ${invoice.customer?.lastName ?? ""}`.trim()}
                </p>
                <p className="text-muted-foreground">{invoice.customerEmail}</p>
                {invoice.customer?.address && (
                  <p className="text-muted-foreground">
                    {invoice.customer.address}
                  </p>
                )}
                {invoice.customer?.phone && (
                  <p className="text-muted-foreground">
                    {invoice.customer.phone}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Invoice Items */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border border-border p-3 text-left">
                        Description
                      </th>
                      <th className="border border-border p-3 text-center">
                        Qty
                      </th>
                      <th className="border border-border p-3 text-right">
                        Unit Price
                      </th>
                      <th className="border border-border p-3 text-center">
                        Discount
                      </th>
                      <th className="border border-border p-3 text-center">
                        Tax Rate
                      </th>
                      <th className="border border-border p-3 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td className="border border-border p-3">
                          {item.description}
                        </td>
                        <td className="border border-border p-3 text-center">
                          {formatAmount(item.quantity)}
                        </td>
                        <td className="border border-border p-3 text-right">
                          {formatAmount(item.unitPrice, invoice.currency)}{" "}
                          {invoice.currency}
                        </td>
                        <td className="border border-border p-3 text-center">
                          {formatAmount(item.discountRate)}%
                        </td>
                        <td className="border border-border p-3 text-center">
                          {formatAmount(item.taxRate)}%
                        </td>
                        <td className="border border-border p-3 text-right font-medium">
                          {formatAmount(
                            calculateItemTotal(item),
                            invoice.currency
                          )}{" "}
                          {invoice.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50">
                      <td
                        colSpan={5}
                        className="border border-border p-3 text-right font-semibold"
                      >
                        Total Amount:
                      </td>
                      <td className="border border-border p-3 text-right font-bold text-lg">
                        {formatAmount(invoice.totalAmount, invoice.currency)}{" "}
                        {invoice.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes and Terms */}
            {(invoice.notes ?? invoice.termsAndConditions) && (
              <>
                <Separator />
                <div className="space-y-4">
                  {invoice.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                  {invoice.termsAndConditions && (
                    <div>
                      <h4 className="font-semibold mb-2">Terms & Conditions</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {invoice.termsAndConditions}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
