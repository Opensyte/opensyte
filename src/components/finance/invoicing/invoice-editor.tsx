"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CalendarIcon,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  FileText,
  RefreshCw,
} from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { CurrencyCombobox } from "./currency-combobox";
import { InvoicePdfPreview } from "./invoice-pdf-preview";
import { calculateInvoiceTotals } from "~/lib/invoice/calc";
import { formatCurrency } from "~/lib/invoice/format";
import type { InvoiceDocumentData } from "./document/invoice-document";

interface ItemValue {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface FormValues {
  customerId: string;
  issueDate: Date;
  dueDate: Date;
  paymentTerms: string;
  currency: string;
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  taxRegistrationId: string;
  discountAmount: number;
  shippingAmount: number;
  paymentInstructions: string;
  notes: string;
  internalNotes: string;
  termsAndConditions: string;
  items: ItemValue[];
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const DEFAULT_DUE_OFFSET_DAYS = 30;

interface InvoiceEditorProps {
  organizationId: string;
  organizationName: string;
  invoiceId?: string;
}

export function InvoiceEditor({
  organizationId,
  organizationName,
  invoiceId,
}: InvoiceEditorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const isEdit = !!invoiceId;

  const { data: customers = [] } =
    api.contactsCrm.getContactsByOrganization.useQuery(
      { organizationId },
      { enabled: !!organizationId }
    );
  const { data: settings, isFetched: settingsFetched } =
    api.invoiceSettings.get.useQuery({ organizationId });
  const { data: existing } = api.invoice.getInvoiceById.useQuery(
    { id: invoiceId ?? "" },
    { enabled: isEdit }
  );

  const form = useForm<FormValues>({
    defaultValues: {
      customerId: "",
      issueDate: new Date(),
      dueDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + DEFAULT_DUE_OFFSET_DAYS);
        return d;
      })(),
      paymentTerms: "Net 30",
      currency: "USD",
      taxEnabled: true,
      taxLabel: "Tax",
      taxRate: 0,
      taxRegistrationId: "",
      discountAmount: 0,
      shippingAmount: 0,
      paymentInstructions: "",
      notes: "",
      internalNotes: "",
      termsAndConditions: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Seed defaults from org settings (create) or the loaded invoice (edit), once.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (isEdit) {
      if (!existing) return;
      form.reset({
        customerId: existing.customerId,
        issueDate: new Date(existing.issueDate),
        dueDate: new Date(existing.dueDate),
        paymentTerms: existing.paymentTerms,
        currency: existing.currency,
        taxEnabled: existing.taxEnabled,
        taxLabel: existing.taxLabel,
        taxRate: num(existing.taxRate),
        taxRegistrationId: existing.taxRegistrationId ?? "",
        discountAmount: num(existing.discountAmount),
        shippingAmount: num(existing.shippingAmount),
        paymentInstructions: existing.paymentInstructions ?? "",
        notes: existing.notes ?? "",
        internalNotes: existing.internalNotes ?? "",
        termsAndConditions: existing.termsAndConditions ?? "",
        items: existing.items
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(i => ({
            description: i.description,
            quantity: num(i.quantity),
            unitPrice: num(i.unitPrice),
          })),
      });
      seeded.current = true;
    } else if (settings) {
      form.reset({
        ...form.getValues(),
        paymentTerms: settings.defaultPaymentTerms,
        currency: settings.defaultCurrency,
        taxEnabled: settings.defaultTaxEnabled,
        taxLabel: settings.defaultTaxLabel,
        taxRate: num(settings.defaultTaxRate),
        taxRegistrationId: settings.taxRegistrationId ?? "",
        paymentInstructions: settings.paymentInstructions ?? "",
        notes: settings.defaultNotes ?? "",
        termsAndConditions: settings.defaultTermsAndConditions ?? "",
      });
      seeded.current = true;
    }
  }, [existing, settings, isEdit, form]);

  const values = form.watch();

  // Build the live document data from the form (debounced into the viewer).
  const previewData = useMemo<InvoiceDocumentData>(() => {
    const cust = customers.find(c => c.id === values.customerId);
    const items = (values.items ?? []).map(it => ({
      description: it.description?.trim() || "Item description",
      quantity: num(it.quantity),
      unitPrice: num(it.unitPrice),
    }));
    const totals = calculateInvoiceTotals({
      items,
      discountAmount: num(values.discountAmount),
      taxEnabled: values.taxEnabled,
      taxRate: num(values.taxRate),
      shippingAmount: num(values.shippingAmount),
      paidAmount: existing?.paidAmount?.toString() ?? 0,
    });
    return {
      businessName: settings?.businessName ?? organizationName,
      businessEmail: settings?.businessEmail ?? null,
      businessPhone: settings?.businessPhone ?? null,
      businessAddress: settings?.businessAddress ?? null,
      businessWebsite: settings?.businessWebsite ?? null,
      logoUrl: settings?.logoUrl ?? null,
      customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : null,
      customerEmail: cust?.email ?? null,
      customerPhone: cust?.phone ?? null,
      customerAddress: cust?.address ?? null,
      invoiceNumber: existing?.invoiceNumber ?? "Draft",
      status: existing?.status ?? "DRAFT",
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      currency: values.currency || "USD",
      locale: "en",
      paymentTerms: values.paymentTerms,
      taxRegistrationId: values.taxRegistrationId || null,
      items: items.map((it, i) => ({
        ...it,
        lineTotal: totals.lineSubtotals[i]?.toString() ?? "0",
      })),
      subtotal: totals.subtotal.toString(),
      discountAmount: totals.discountAmount.toString(),
      taxEnabled: values.taxEnabled,
      taxLabel: values.taxLabel || "Tax",
      taxRate: num(values.taxRate),
      taxAmount: totals.taxAmount.toString(),
      shippingAmount: totals.shippingAmount.toString(),
      totalAmount: totals.totalAmount.toString(),
      paidAmount: existing?.paidAmount?.toString() ?? "0",
      balanceDue: totals.balanceDue.toString(),
      paymentInstructions: values.paymentInstructions || null,
      notes: values.notes || null,
      termsAndConditions: values.termsAndConditions || null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values), customers, settings, existing, organizationName]);

  // PDF rendering is expensive, so we do NOT recompile on every keystroke.
  // The user explicitly refreshes the preview via the "Update preview" button;
  // the instant numeric totals recap below gives immediate feedback meanwhile.
  const previewHash = useMemo(() => JSON.stringify(previewData), [previewData]);
  const previewDataRef = useRef(previewData);
  previewDataRef.current = previewData;
  const previewHashRef = useRef(previewHash);
  previewHashRef.current = previewHash;

  const [compiled, setCompiled] = useState<{
    data: InvoiceDocumentData;
    key: number;
    hash: string;
  } | null>(null);

  const compilePreview = useCallback(() => {
    setCompiled(prev => ({
      data: previewDataRef.current,
      key: (prev?.key ?? 0) + 1,
      hash: previewHashRef.current,
    }));
  }, []);

  // Auto-generate the FIRST preview once form data is ready (loaded settings for
  // create, or the existing invoice for edit). After that it's manual.
  const firstCompiled = useRef(false);
  useEffect(() => {
    if (firstCompiled.current) return;
    const ready = isEdit ? !!existing : settingsFetched;
    if (!ready) return;
    const t = setTimeout(() => {
      compilePreview();
      firstCompiled.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [existing, settingsFetched, isEdit, compilePreview]);

  const previewDirty = compiled ? compiled.hash !== previewHash : true;

  const liveTotals = useMemo(
    () =>
      calculateInvoiceTotals({
        items: (values.items ?? []).map(it => ({
          quantity: num(it.quantity),
          unitPrice: num(it.unitPrice),
        })),
        discountAmount: num(values.discountAmount),
        taxEnabled: values.taxEnabled,
        taxRate: num(values.taxRate),
        shippingAmount: num(values.shippingAmount),
      }),
    [values.items, values.discountAmount, values.taxEnabled, values.taxRate, values.shippingAmount]
  );

  const createMutation = api.invoice.createInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice created");
      void utils.invoice.listInvoices.invalidate();
      router.push(`/${organizationId}/finance/invoices`);
    },
    onError: e => toast.error(e.message ?? "Failed to create invoice"),
  });
  const updateMutation = api.invoice.updateInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated");
      void utils.invoice.listInvoices.invalidate();
      if (invoiceId) void utils.invoice.getInvoiceById.invalidate({ id: invoiceId });
      router.push(`/${organizationId}/finance/invoices`);
    },
    onError: e => toast.error(e.message ?? "Failed to update invoice"),
  });

  const submitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (v: FormValues) => {
    if (!v.customerId) {
      toast.error("Please select a customer");
      return;
    }
    const payload = {
      organizationId,
      customerId: v.customerId,
      issueDate: v.issueDate,
      dueDate: v.dueDate,
      paymentTerms: v.paymentTerms,
      currency: v.currency,
      locale: "en",
      taxEnabled: v.taxEnabled,
      taxLabel: v.taxLabel,
      taxRate: num(v.taxRate),
      taxRegistrationId: v.taxRegistrationId || undefined,
      discountAmount: num(v.discountAmount),
      shippingAmount: num(v.shippingAmount),
      paymentInstructions: v.paymentInstructions || undefined,
      notes: v.notes || undefined,
      internalNotes: v.internalNotes || undefined,
      termsAndConditions: v.termsAndConditions || undefined,
      items: v.items.map(it => ({
        description: it.description,
        quantity: num(it.quantity),
        unitPrice: num(it.unitPrice),
      })),
    };
    if (isEdit && invoiceId) {
      updateMutation.mutate({ id: invoiceId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${organizationId}/finance/invoices`)}
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isEdit ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {existing?.invoiceNumber ?? "Draft — number assigned on creation"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${organizationId}/finance/invoices`)}
            className="hidden sm:inline-flex"
          >
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isEdit ? "Save Changes" : "Create Invoice"}
          </Button>
        </div>
      </div>

      {/* Two panes */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Form pane */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 overflow-y-auto p-4 md:p-6"
        >
          {/* Customer */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Bill To
            </h2>
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                        {!c.email && " (no email)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </section>

          <Separator />

          {/* Dates & terms */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label>Issue Date</Label>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label>Due Date</Label>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </div>
              )}
            />
            <div className="flex flex-col gap-1.5">
              <Label>Payment Terms</Label>
              <Input className="h-10" {...form.register("paymentTerms")} />
            </div>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label>Currency</Label>
                  <CurrencyCombobox value={field.value} onChange={field.onChange} />
                </div>
              )}
            />
          </section>

          <Separator />

          {/* Line items */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Items
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ description: "", quantity: 1, unitPrice: 0 })
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div
                  key={f.id}
                  className="grid grid-cols-12 items-start gap-2 rounded-lg border bg-card p-2"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <Input
                      placeholder="Description"
                      className="h-9"
                      {...form.register(`items.${idx}.description`)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Qty"
                      className="h-9"
                      {...form.register(`items.${idx}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Unit price"
                      className="h-9"
                      {...form.register(`items.${idx}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="col-span-3 flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="col-span-12 px-1 text-right text-xs text-muted-foreground">
                    {formatCurrency(
                      num(values.items?.[idx]?.quantity) *
                        num(values.items?.[idx]?.unitPrice),
                      values.currency || "USD"
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Tax / discount / shipping */}
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Apply tax</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle off for clients with no applicable tax
                </p>
              </div>
              <Controller
                control={form.control}
                name="taxEnabled"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            {values.taxEnabled && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Tax label</Label>
                  <Input
                    className="h-10"
                    placeholder="VAT, GST, Sales Tax…"
                    {...form.register("taxLabel")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tax rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="h-10"
                    {...form.register("taxRate", { valueAsNumber: true })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tax / Reg. ID</Label>
                  <Input
                    className="h-10"
                    placeholder="Optional"
                    {...form.register("taxRegistrationId")}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Discount ({values.currency || "USD"})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10"
                  {...form.register("discountAmount", { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Shipping ({values.currency || "USD"})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10"
                  {...form.register("shippingAmount", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Totals recap */}
            <Card>
              <CardContent className="space-y-1.5 p-4 text-sm">
                <Row label="Subtotal" value={formatCurrency(liveTotals.subtotal.toString(), values.currency || "USD")} />
                {liveTotals.discountAmount.gt(0) && (
                  <Row label="Discount" value={`-${formatCurrency(liveTotals.discountAmount.toString(), values.currency || "USD")}`} />
                )}
                {values.taxEnabled && (
                  <Row
                    label={`${values.taxLabel || "Tax"} (${num(values.taxRate)}%)`}
                    value={formatCurrency(liveTotals.taxAmount.toString(), values.currency || "USD")}
                  />
                )}
                {liveTotals.shippingAmount.gt(0) && (
                  <Row label="Shipping" value={formatCurrency(liveTotals.shippingAmount.toString(), values.currency || "USD")} />
                )}
                <Separator className="my-1" />
                <Row
                  label="Total"
                  value={formatCurrency(liveTotals.totalAmount.toString(), values.currency || "USD")}
                  strong
                />
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Payment instructions & notes */}
          <section className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label>Payment Instructions</Label>
              <Textarea
                rows={3}
                placeholder="Bank / IBAN / SWIFT, PayPal, Wise, etc."
                {...form.register("paymentInstructions")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                placeholder="Visible to the client"
                {...form.register("notes")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Terms &amp; Conditions</Label>
              <Textarea rows={2} {...form.register("termsAndConditions")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Internal Notes</Label>
              <Textarea
                rows={2}
                placeholder="Private — not shown to the client"
                {...form.register("internalNotes")}
              />
            </div>
          </section>
        </form>

        {/* Preview pane */}
        <div className="hidden border-l bg-muted/30 lg:flex lg:flex-col">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Invoice preview — what the client receives
            </div>
            <div className="flex items-center gap-2">
              {previewDirty && compiled && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Out of date
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant={previewDirty ? "default" : "outline"}
                onClick={compilePreview}
                disabled={!previewDirty}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Update preview
              </Button>
            </div>
          </div>
          <div className="flex-1">
            {compiled ? (
              <InvoicePdfPreview data={compiled.data} refreshKey={compiled.key} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <p className="max-w-xs text-sm text-muted-foreground">
                  Generate a preview to see exactly what the client will receive.
                </p>
                <Button type="button" onClick={compilePreview}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Generate preview
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>
        {label}
      </span>
      <span className={cn(strong && "text-base font-bold")}>{value}</span>
    </div>
  );
}

function DatePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d?: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
          {value ? format(value, "PPP") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
