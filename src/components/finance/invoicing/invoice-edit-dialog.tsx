"use client";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
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
import { InvoiceDialogSkeleton } from "./invoice-skeletons";
import type { InvoiceEditDialogProps } from "~/types";
import { currencies } from "~/types/currencies";

const itemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description required"),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  taxRate: z.string().default("0"),
  discountRate: z.string().default("0"),
});

const schema = z.object({
  customerId: z.string().cuid({ message: "Customer required" }),
  issueDate: z.date({ required_error: "Issue date required" }),
  dueDate: z.date({ required_error: "Due date required" }),
  paymentTerms: z.string().min(1).default("Net 30"),
  currency: z.string().min(1).default("USD"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item"),
});

type FormValues = z.infer<typeof schema>;

export function InvoiceEditDialog({
  open,
  onOpenChange,
  organizationId,
  invoiceId,
  onUpdated,
}: InvoiceEditDialogProps) {
  const utils = api.useUtils();
  const [submitting, setSubmitting] = useState(false);

  const { data: customers = [], isLoading: isCustomersLoading } =
    api.contactsCrm.getContactsByOrganization.useQuery(
      { organizationId },
      { enabled: !!organizationId }
    );

  const { data: invoice, isLoading: isInvoiceLoading } =
    api.invoice.getInvoiceById.useQuery(
      { id: invoiceId! },
      { enabled: !!invoiceId }
    );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentTerms: "Net 30",
      currency: "USD",
      issueDate: new Date(),
      dueDate: new Date(),
      items: [
        {
          description: "",
          quantity: "1",
          unitPrice: "0",
          taxRate: "0",
          discountRate: "0",
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Reset form when invoice data is loaded (and ensure controlled select catches up)
  useEffect(() => {
    if (invoice) {
      form.reset({
        customerId: invoice.customerId ?? "",
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paymentTerms: invoice.paymentTerms,
        currency: invoice.currency,
        notes: invoice.notes ?? "",
        internalNotes: invoice.internalNotes ?? "",
        termsAndConditions: invoice.termsAndConditions ?? "",
        items: invoice.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          taxRate: item.taxRate?.toString() ?? "0",
          discountRate: item.discountRate?.toString() ?? "0",
        })),
      });
      // Force-set customerId after reset in case Select internal state missed the reset
      if (invoice.customerId) {
        // next microtask ensures reset settled
        queueMicrotask(() => {
          form.setValue("customerId", invoice.customerId, {
            shouldDirty: false,
            shouldTouch: false,
            shouldValidate: false,
          });
        });
      }
    }
  }, [invoice, form]);

  // In rare cases customers load after invoice; when both present ensure value still set
  useEffect(() => {
    if (invoice?.customerId && !form.getValues("customerId")) {
      form.setValue("customerId", invoice.customerId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [invoice?.customerId, customers, form]);

  const updateMutation = api.invoice.updateInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated");
      void utils.invoice.listInvoices.invalidate();
      void utils.invoice.getInvoiceById.invalidate();
      onUpdated?.();
      onOpenChange(false);
    },
    onError: err => toast.error(err.message ?? "Failed to update invoice"),
    onSettled: () => setSubmitting(false),
  });

  const onSubmit = (values: FormValues) => {
    if (!invoiceId) return;

    setSubmitting(true);
    updateMutation.mutate({
      id: invoiceId,
      organizationId,
      notes: values.notes,
      internalNotes: values.internalNotes,
      termsAndConditions: values.termsAndConditions,
      // For now, we'll add all items as new items and remove old ones
      // This is a simplified approach - in production you'd want to handle updates more granularly
      addItems: values.items
        .filter(i => !i.id) // Only new items without existing IDs
        .map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity),
          unitPrice: parseFloat(i.unitPrice),
          taxRate: parseFloat(i.taxRate || "0"),
          discountRate: parseFloat(i.discountRate || "0"),
        })),
      removeItemIds:
        invoice?.items
          .filter(item => !values.items.some(v => v.id === item.id))
          .map(item => item.id) ?? [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[850px]">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
          <DialogDescription>Update invoice details</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {isCustomersLoading || isInvoiceLoading ? (
            <InvoiceDialogSkeleton />
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer and Basic Info */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map(
                            (c: {
                              id: string;
                              firstName: string;
                              lastName: string;
                            }) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.firstName} {c.lastName}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Issue Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-10 w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={date => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-10 w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={date => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Net 30"
                            {...field}
                            className="h-10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map(currency => (
                              <SelectItem
                                key={currency.code}
                                value={currency.code}
                              >
                                {currency.code} - {currency.name} (
                                {currency.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Invoice Items</h4>
                    <p className="text-xs text-muted-foreground">
                      Update items in your invoice
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        description: "",
                        quantity: "1",
                        unitPrice: "0",
                        taxRate: "0",
                        discountRate: "0",
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((f, idx) => (
                    <div
                      key={f.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h5 className="text-sm font-medium">Item {idx + 1}</h5>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(idx)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Description *
                          </label>
                          <Input
                            placeholder="Item description"
                            {...form.register(`items.${idx}.description`)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Quantity *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="1"
                            {...form.register(`items.${idx}.quantity`)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Unit Price *
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...form.register(`items.${idx}.unitPrice`)}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 mt-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Tax Rate (%)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...form.register(`items.${idx}.taxRate`)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">
                            Discount Rate (%)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0"
                            {...form.register(`items.${idx}.discountRate`)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Add any notes for the customer (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Internal notes (not visible to customer)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termsAndConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms and Conditions</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Terms and conditions (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={submitting || !form.formState.isValid}
                >
                  {submitting ? "Updating..." : "Update Invoice"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
