"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
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
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import {
  ExpenseStatusSchema,
  PaymentMethodSchema,
  type ExpenseStatusType,
  type PaymentMethodType,
  type ExpenseFilters,
  expenseStatusLabels,
  paymentMethodLabels,
} from "~/types/expenses";
import { Badge } from "~/components/ui/badge";
import { X } from "lucide-react";

// Form schema for filters
const filtersFormSchema = z.object({
  status: z.array(ExpenseStatusSchema).optional(),
  categoryId: z.array(z.string()).optional(),
  paymentMethod: z.array(PaymentMethodSchema).optional(),
  projectId: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  amountMin: z.string().optional(),
  amountMax: z.string().optional(),
  reimbursable: z.enum(["", "true", "false"]).optional(),
});

type FiltersFormData = z.infer<typeof filtersFormSchema>;

interface ExpenseFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  filters: ExpenseFilters;
  onApplyFilters: (filters: ExpenseFilters) => void;
}

export function ExpenseFiltersDialog({
  open,
  onOpenChange,
  organizationId,
  filters,
  onApplyFilters,
}: ExpenseFiltersDialogProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<ExpenseStatusType[]>(
    filters.status ?? []
  );
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    PaymentMethodType[]
  >(filters.paymentMethod ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filters.categoryId ?? []
  );

  const form = useForm<FiltersFormData>({
    resolver: zodResolver(filtersFormSchema),
    defaultValues: {
      status: filters.status ?? [],
      categoryId: filters.categoryId ?? [],
      paymentMethod: filters.paymentMethod ?? [],
      projectId: filters.projectId ?? [],
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      amountMin: filters.amountMin?.toString() ?? "",
      amountMax: filters.amountMax?.toString() ?? "",
      reimbursable:
        filters.reimbursable === undefined
          ? ""
          : filters.reimbursable
            ? "true"
            : "false",
    },
  });

  // API queries
  const { data: categories = [] } = api.expenseCategories.list.useQuery({
    organizationId,
  });

  const onSubmit = (data: FiltersFormData) => {
    const newFilters: ExpenseFilters = {
      status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      categoryId:
        selectedCategories.length > 0 ? selectedCategories : undefined,
      paymentMethod:
        selectedPaymentMethods.length > 0 ? selectedPaymentMethods : undefined,
      projectId:
        data.projectId && data.projectId.length > 0
          ? data.projectId
          : undefined,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      amountMin:
        data.amountMin && !isNaN(Number(data.amountMin))
          ? Number(data.amountMin)
          : undefined,
      amountMax:
        data.amountMax && !isNaN(Number(data.amountMax))
          ? Number(data.amountMax)
          : undefined,
      reimbursable:
        data.reimbursable === "" ? undefined : data.reimbursable === "true",
    };

    onApplyFilters(newFilters);
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedPaymentMethods([]);
    setSelectedCategories([]);
    form.reset({
      status: [],
      categoryId: [],
      paymentMethod: [],
      projectId: [],
      dateFrom: undefined,
      dateTo: undefined,
      amountMin: "",
      amountMax: "",
      reimbursable: "",
    });
    onApplyFilters({});
  };

  const toggleStatus = (status: ExpenseStatusType) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePaymentMethod = (method: PaymentMethodType) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">Filter Expenses</DialogTitle>
          <DialogDescription className="text-base">
            Apply filters to narrow down your expense list and find exactly what
            you&apos;re looking for.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Quick Filters Section */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Quick Filters
                </h3>

                {/* Status Filter */}
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">Status</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {(
                      Object.keys(expenseStatusLabels) as ExpenseStatusType[]
                    ).map(status => (
                      <Badge
                        key={status}
                        variant={
                          selectedStatuses.includes(status)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer hover:bg-primary/80 transition-colors text-sm py-1 px-3"
                        onClick={() => toggleStatus(status)}
                      >
                        {expenseStatusLabels[status]}
                        {selectedStatuses.includes(status) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    Payment Method
                  </FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {(
                      Object.keys(paymentMethodLabels) as PaymentMethodType[]
                    ).map(method => (
                      <Badge
                        key={method}
                        variant={
                          selectedPaymentMethods.includes(method)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer hover:bg-primary/80 transition-colors text-sm py-1 px-3"
                        onClick={() => togglePaymentMethod(method)}
                      >
                        {paymentMethodLabels[method]}
                        {selectedPaymentMethods.includes(method) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium">
                    Category
                  </FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {categories.length > 0 ? (
                      categories.map(category => (
                        <Badge
                          key={category.id}
                          variant={
                            selectedCategories.includes(category.id)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:bg-primary/80 transition-colors text-sm py-1 px-3"
                          onClick={() => toggleCategory(category.id)}
                        >
                          {category.name}
                          {selectedCategories.includes(category.id) && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No categories available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Filters Section */}
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Advanced Filters
              </h3>

              {/* Date Range */}
              <div className="space-y-4">
                <FormLabel className="text-sm font-medium">
                  Date Range
                </FormLabel>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dateFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs text-muted-foreground">
                          From Date
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal h-10",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick start date</span>
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
                    name="dateTo"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs text-muted-foreground">
                          To Date
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal h-10",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick end date</span>
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
                </div>
              </div>

              {/* Amount Range */}
              <div className="space-y-4">
                <FormLabel className="text-sm font-medium">
                  Amount Range
                </FormLabel>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="amountMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Minimum Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amountMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Maximum Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0"
                            className="h-10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Reimbursable Filter */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="reimbursable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Reimbursable Status
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="All expenses" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All expenses</SelectItem>
                          <SelectItem value="true">
                            Reimbursable only
                          </SelectItem>
                          <SelectItem value="false">
                            Non-reimbursable only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Clear All Filters
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                Apply Filters
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
