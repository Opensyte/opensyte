"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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
import type { Employee } from "~/types";
import { payrollStatusLabels } from "~/types";
import { PayrollStatusSchema } from "../../../../prisma/generated/zod/index";
import { currencies, type CurrencyCode } from "~/types";
import { PayrollDialogSkeleton } from "./payroll-skeletons";

const schema = z.object({
  employeeId: z.string().cuid().optional(),
  payPeriodStart: z.date().optional(),
  payPeriodEnd: z.date().optional(),
  payDate: z.date().optional(),
  basicSalary: z.string().optional(),
  overtime: z.string().optional(),
  bonus: z.string().optional(),
  tax: z.string().optional(),
  deductions: z.string().optional(),
  currency: z.custom<CurrencyCode>().optional(),
  status: PayrollStatusSchema.optional(),
  notes: z.string().optional(),
});

export type PayrollEditForm = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  payrollId?: string;
  onUpdated?: () => void;
}

export function PayrollEditDialog({
  open,
  onOpenChange,
  organizationId,
  payrollId,
  onUpdated,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const utils = api.useUtils();

  const { data: employees = [] } = api.hr.getEmployeesByOrganization.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: payroll, isLoading } = api.hr.getPayrollById.useQuery(
    { id: payrollId ?? "" },
    { enabled: !!open && !!payrollId }
  );

  const form = useForm<PayrollEditForm>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      employeeId: undefined,
      payPeriodStart: undefined,
      payPeriodEnd: undefined,
      payDate: undefined,
      basicSalary: "",
      overtime: "",
      bonus: "",
      tax: "",
      deductions: "",
      currency: undefined,
      status: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (payroll) {
      form.reset({
        employeeId: payroll.employee?.id || undefined,
        payPeriodStart: payroll.payPeriodStart
          ? new Date(payroll.payPeriodStart)
          : undefined,
        payPeriodEnd: payroll.payPeriodEnd
          ? new Date(payroll.payPeriodEnd)
          : undefined,
        payDate: payroll.payDate ? new Date(payroll.payDate) : undefined,
        basicSalary:
          payroll.basicSalary != null ? String(payroll.basicSalary) : "",
        overtime: payroll.overtime != null ? String(payroll.overtime) : "",
        bonus: payroll.bonus != null ? String(payroll.bonus) : "",
        tax: payroll.tax != null ? String(payroll.tax) : "",
        deductions:
          payroll.deductions != null ? String(payroll.deductions) : "",
        currency: (payroll.currency as CurrencyCode) ?? undefined,
        status: payroll.status ?? undefined,
        notes: payroll.notes ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollId, payroll]);

  const updateMutation = api.hr.updatePayroll.useMutation({
    onSuccess: () => {
      toast.success("Payroll updated successfully");
      void utils.hr.getPayrollsByOrganization.invalidate();
      onUpdated?.();
      onOpenChange(false);
    },
    onError: err => toast.error(err.message ?? "Failed to update payroll"),
    onSettled: () => setSubmitting(false),
  });

  const onSubmit = (data: PayrollEditForm) => {
    if (!payrollId) return;
    setSubmitting(true);

    updateMutation.mutate({
      id: payrollId,
      organizationId,
      employeeId: data.employeeId,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      payDate: data.payDate,
      basicSalary: data.basicSalary ? parseFloat(data.basicSalary) : undefined,
      overtime: data.overtime ? parseFloat(data.overtime) : undefined,
      bonus: data.bonus ? parseFloat(data.bonus) : undefined,
      tax: data.tax ? parseFloat(data.tax) : undefined,
      deductions: data.deductions ? parseFloat(data.deductions) : undefined,
      currency: data.currency ?? undefined,
      status: data.status,
      notes: data.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payroll</DialogTitle>
          <DialogDescription>Update payroll details.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <PayrollDialogSkeleton />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Employee */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Employee
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={value =>
                          field.onChange(value === "" ? undefined : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((e: Employee) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.firstName} {e.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Status
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={value =>
                          field.onChange(value === "" ? undefined : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(payrollStatusLabels).map(
                            ([status, label]) => (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      status === "DRAFT" && "bg-gray-500",
                                      status === "PENDING" && "bg-yellow-500",
                                      status === "APPROVED" && "bg-blue-500",
                                      status === "PAID" && "bg-green-500",
                                      status === "CANCELLED" && "bg-red-500"
                                    )}
                                  />
                                  {label}
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency */}
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Currency
                      </FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={value =>
                          field.onChange(value === "" ? undefined : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {currencies.map(currency => (
                            <SelectItem
                              key={currency.code}
                              value={currency.code}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {currency.symbol}
                                </span>
                                <span>{currency.code}</span>
                                <span className="text-muted-foreground">
                                  - {currency.name}
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

                {/* Pay Date */}
                <FormField
                  control={form.control}
                  name="payDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base font-medium">
                        Pay Date
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pay Period Start */}
                <FormField
                  control={form.control}
                  name="payPeriodStart"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base font-medium">
                        Pay Period Start
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pay Period End */}
                <FormField
                  control={form.control}
                  name="payPeriodEnd"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base font-medium">
                        Pay Period End
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Numbers */}
                <FormField
                  control={form.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Basic Salary
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overtime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Overtime
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bonus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Bonus
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Tax
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deductions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Deductions
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Optional notes"
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
