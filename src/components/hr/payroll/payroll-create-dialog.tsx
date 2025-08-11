"use client";

import { useState } from "react";
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
  employeeId: z.string().cuid({ message: "Employee is required" }),
  payPeriodStart: z.date({ required_error: "Start date is required" }),
  payPeriodEnd: z.date({ required_error: "End date is required" }),
  payDate: z.date({ required_error: "Pay date is required" }),
  basicSalary: z.string().min(1, "Basic salary is required"),
  overtime: z.string().optional(),
  bonus: z.string().optional(),
  tax: z.string().optional(),
  deductions: z.string().optional(),
  currency: z.custom<CurrencyCode>().default("USD"),
  status: PayrollStatusSchema.default("DRAFT"),
  notes: z.string().optional(),
});

export type PayrollCreateForm = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated?: () => void;
}

export function PayrollCreateDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const utils = api.useUtils();

  const { data: employees = [], isLoading: isEmployeesLoading } =
    api.hr.getEmployeesByOrganization.useQuery(
      { organizationId },
      { enabled: !!organizationId }
    );

  const form = useForm<PayrollCreateForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "DRAFT",
      currency: "USD",
    },
    mode: "onChange",
  });

  const createMutation = api.hr.createPayroll.useMutation({
    onSuccess: () => {
      toast.success("Payroll created successfully");
      void utils.hr.getPayrollsByOrganization.invalidate();
      form.reset({ status: "DRAFT", currency: "USD" });
      onCreated?.();
      onOpenChange(false);
    },
    onError: err => toast.error(err.message ?? "Failed to create payroll"),
    onSettled: () => setSubmitting(false),
  });

  const onSubmit = (data: PayrollCreateForm) => {
    setSubmitting(true);
    createMutation.mutate({
      organizationId,
      employeeId: data.employeeId,
      payPeriodStart: data.payPeriodStart,
      payPeriodEnd: data.payPeriodEnd,
      payDate: data.payDate,
      basicSalary: parseFloat(data.basicSalary),
      overtime: data.overtime ? parseFloat(data.overtime) : undefined,
      bonus: data.bonus ? parseFloat(data.bonus) : undefined,
      tax: data.tax ? parseFloat(data.tax) : undefined,
      deductions: data.deductions ? parseFloat(data.deductions) : undefined,
      currency: data.currency,
      status: data.status,
      notes: data.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Payroll Entry</DialogTitle>
          <DialogDescription>
            Add a new payroll entry for an employee
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {isEmployeesLoading ? (
            <PayrollDialogSkeleton />
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 py-4 sm:grid-cols-2">
                {/* Employee */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Employee *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((employee: Employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pay Period Start */}
                <FormField
                  control={form.control}
                  name="payPeriodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Pay Period Start *
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
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
                            disabled={date =>
                              date > new Date("2100-01-01") ||
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

                {/* Pay Period End */}
                <FormField
                  control={form.control}
                  name="payPeriodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Pay Period End *
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
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
                            disabled={date =>
                              date > new Date("2100-01-01") ||
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

                {/* Currency */}
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Currency *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
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

                {/* Basic Salary */}
                <FormField
                  control={form.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Basic Salary *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pay Date */}
                <FormField
                  control={form.control}
                  name="payDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Pay Date *
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
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
                            disabled={date => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-base font-medium">
                        Status *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
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

                {/* Overtime */}
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
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bonus */}
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
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax */}
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
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Deductions */}
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
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
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
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={submitting || !form.formState.isValid}
                >
                  {submitting ? "Creating..." : "Create Payroll"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
