"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
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
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  CalendarIcon,
  Loader2,
  Receipt,
  DollarSign,
  Building2,
  CreditCard,
  FileText,
  Tag,
} from "lucide-react";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { PaymentMethodSchema, type PaymentMethodType } from "~/types/expenses";
import { paymentMethodLabels } from "~/types/expenses";
import { currencies, type CurrencyCode } from "~/types/currencies";

// Form schema
const expenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      val => !isNaN(Number(val)) && Number(val) > 0,
      "Amount must be a positive number"
    ),
  currency: z
    .string()
    .refine(
      (val): val is CurrencyCode => currencies.some(c => c.code === val),
      "Invalid currency"
    )
    .default("USD"),
  date: z.date({
    required_error: "Date is required",
  }),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  customCategory: z.string().optional(),
  vendor: z.string().optional(),
  paymentMethod: PaymentMethodSchema.default("CREDIT_CARD"),
  projectId: z.string().optional(),
  reimbursable: z.boolean().default(false),
  receipt: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  expenseId?: string;
  onUpdated?: () => void;
}

export function ExpenseEditDialog({
  open,
  onOpenChange,
  organizationId,
  expenseId,
  onUpdated,
}: ExpenseEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      currency: "USD",
      date: new Date(),
      description: "",
      categoryId: "",
      customCategory: "",
      vendor: "",
      paymentMethod: "CREDIT_CARD",
      projectId: "",
      reimbursable: false,
      receipt: "",
      notes: "",
    },
  });

  // API queries
  const { data: categories = [] } = api.expenseCategories.list.useQuery({
    organizationId,
  });

  const { data: expense, isLoading: isLoadingExpense } =
    api.expense.getById.useQuery(
      {
        id: expenseId!,
        organizationId,
      },
      {
        enabled: !!expenseId,
      }
    );

  const updateMutation = api.expense.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully");
      onUpdated?.();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update expense");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Populate form when expense data is loaded
  useEffect(() => {
    if (expense) {
      form.reset({
        amount: expense.amount.toString(),
        currency: expense.currency as CurrencyCode,
        date: new Date(expense.date),
        description: expense.description ?? "",
        categoryId: expense.categoryId ?? "",
        customCategory: expense.customCategory ?? "",
        vendor: expense.vendor ?? "",
        paymentMethod: expense.paymentMethod,
        projectId: expense.projectId ?? "",
        reimbursable: expense.reimbursable,
        receipt: expense.receipt ?? "",
        notes: expense.notes ?? "",
      });
    }
  }, [expense, form]);

  const onSubmit = (data: ExpenseFormData) => {
    if (!expenseId) return;

    setIsSubmitting(true);
    updateMutation.mutate({
      id: expenseId,
      organizationId,
      data: {
        amount: Number(data.amount),
        currency: data.currency,
        date: data.date,
        description: data.description ?? undefined,
        categoryId: data.categoryId ?? undefined,
        customCategory: data.customCategory ?? undefined,
        vendor: data.vendor ?? undefined,
        paymentMethod: data.paymentMethod,
        projectId: data.projectId ?? undefined,
        reimbursable: data.reimbursable,
        receipt: data.receipt ?? undefined,
        notes: data.notes ?? undefined,
      },
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const selectedCurrency = currencies.find(
    c => c.code === form.watch("currency")
  );

  if (isLoadingExpense) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading expense details...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Edit Expense
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Update expense details and information
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Essential Information */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <DollarSign className="h-4 w-4" />
                  Essential Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount and Currency Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Amount *
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-9 h-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Currency
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map(currency => (
                              <SelectItem
                                key={currency.code}
                                value={currency.code}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {currency.code}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {currency.symbol} - {currency.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Date and Description */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium">
                          Date *
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-10 w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={date =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Description
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Brief description..."
                              className="pl-9 h-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categorization */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Tag className="h-4 w-4" />
                  Categorization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Category
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select a category..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.length === 0 ? (
                              <div className="px-2 py-1 text-sm text-muted-foreground">
                                No categories available
                              </div>
                            ) : (
                              categories.map(category => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {category.name}
                                    </Badge>
                                    {category.description && (
                                      <span className="text-muted-foreground text-xs">
                                        {category.description}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Custom Category
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Or enter custom category..."
                              className="pl-9 h-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Vendor/Merchant
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Company or person paid..."
                              className="pl-9 h-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Payment Method
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              Object.keys(
                                paymentMethodLabels
                              ) as PaymentMethodType[]
                            ).map(method => (
                              <SelectItem key={method} value={method}>
                                {paymentMethodLabels[method]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reimbursable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          Request Reimbursement
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Check this if you want to be reimbursed for this
                          expense
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <FileText className="h-4 w-4" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes, receipt details, or other relevant information..."
                          className="resize-none min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Footer Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedCurrency && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCurrency.symbol} {selectedCurrency.code}
                  </Badge>
                )}
                <span>All fields marked with * are required</span>
              </div>
              <div className="flex gap-3 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Expense
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
