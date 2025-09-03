import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Filter, Settings } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import { Calendar } from "lucide-react";

// Schema that matches the API expectations exactly
const reportFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().optional(),
  type: z.enum([
    "INCOME_STATEMENT",
    "BALANCE_SHEET",
    "CASH_FLOW",
    "EXPENSE_REPORT",
    "PROFIT_LOSS",
    "CUSTOM",
  ]),
  filters: z.object({
    dateRange: z.object({
      startDate: z.date(),
      endDate: z.date(),
      preset: z.string().optional(),
    }),
    categories: z.array(z.string()).optional(),
    projects: z.array(z.string()).optional(),
    departments: z.array(z.string()).optional(),
    vendors: z.array(z.string()).optional(),
    paymentMethods: z.array(z.string()).optional(),
  }),
  template: z.object({
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(["data", "calculation", "summary"]),
        fields: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            source: z.enum(["expenses", "invoices", "custom"]),
            field: z.string(),
            format: z
              .enum(["currency", "percentage", "number", "date"])
              .optional(),
            aggregation: z
              .enum(["sum", "avg", "count", "min", "max"])
              .optional(),
          })
        ),
        calculations: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              formula: z.string(),
              format: z.enum(["currency", "percentage", "number"]).optional(),
            })
          )
          .optional(),
      })
    ),
    groupBy: z.array(z.string()).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    showComparisons: z.boolean().optional(),
    showPercentages: z.boolean().optional(),
    includeSubtotals: z.boolean().optional(),
  }),
});

type ReportFormData = z.infer<typeof reportFormSchema>;

// Define the report type based on what we expect from the API
interface FinancialReportForEdit {
  id: string;
  name: string;
  description?: string | null;
  type:
    | "INCOME_STATEMENT"
    | "BALANCE_SHEET"
    | "CASH_FLOW"
    | "EXPENSE_REPORT"
    | "PROFIT_LOSS"
    | "CUSTOM";
  template?: unknown;
  dateRange?: unknown;
}

interface ReportEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: FinancialReportForEdit | null;
  onUpdated: () => void;
}

export function ReportEditDialog({
  open,
  onOpenChange,
  report,
  onUpdated,
}: ReportEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "INCOME_STATEMENT",
      filters: {
        dateRange: {
          startDate: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ),
          endDate: new Date(),
        },
      },
      template: {
        sections: [
          {
            id: "main",
            title: "Financial Data",
            type: "data" as const,
            fields: [
              {
                id: "total",
                label: "Total Amount",
                source: "expenses" as const,
                field: "amount",
                format: "currency" as const,
                aggregation: "sum" as const,
              },
            ],
          },
        ],
        showComparisons: false,
        showPercentages: true,
        includeSubtotals: false,
      },
    },
  });

  const updateReport = api.financialReports.update.useMutation();

  // Load report data when dialog opens
  useEffect(() => {
    if (open && report) {
      // Parse dates from the report - with type guards
      const dateRange = report.dateRange as
        | { startDate?: string | Date; endDate?: string | Date }
        | null
        | undefined;
      const startDate = dateRange?.startDate
        ? new Date(dateRange.startDate)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = dateRange?.endDate
        ? new Date(dateRange.endDate)
        : new Date();

      // Parse template data with fallbacks
      const template =
        (report.template as
          | {
              sections?: Array<{
                id: string;
                title: string;
                type: "data" | "calculation" | "summary";
                fields: Array<{
                  id: string;
                  label: string;
                  source: "expenses" | "invoices" | "custom";
                  field: string;
                  format?: "currency" | "percentage" | "number" | "date";
                  aggregation?: "sum" | "avg" | "count" | "min" | "max";
                }>;
              }>;
              showComparisons?: boolean;
              showPercentages?: boolean;
              includeSubtotals?: boolean;
            }
          | null
          | undefined) ?? {};

      form.reset({
        name: report.name,
        description: report.description ?? "",
        type: report.type,
        filters: {
          dateRange: {
            startDate,
            endDate,
          },
        },
        template: {
          sections: template.sections ?? [
            {
              id: "main",
              title: "Financial Data",
              type: "data" as const,
              fields: [
                {
                  id: "total",
                  label: "Total Amount",
                  source: "expenses" as const,
                  field: "amount",
                  format: "currency" as const,
                  aggregation: "sum" as const,
                },
              ],
            },
          ],
          showComparisons: template.showComparisons ?? false,
          showPercentages: template.showPercentages ?? true,
          includeSubtotals: template.includeSubtotals ?? false,
        },
      });
    }
  }, [open, report, form]);

  const handleSubmit = async (data: ReportFormData) => {
    if (!report) return;

    setIsLoading(true);
    try {
      await updateReport.mutateAsync({
        id: report.id,
        name: data.name,
        description: data.description,
        filters: data.filters,
        template: data.template,
      });

      toast.success("Report updated successfully");
      onUpdated();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update report");
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render dialog content if no report
  if (!report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>No report data available.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Financial Report</DialogTitle>
          <DialogDescription>
            Update the report configuration and template options.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter report name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional description"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Date Range Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Date Range & Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="filters.dateRange.startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a start date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
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
                        <FormDescription>
                          Report start date (required)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="filters.dateRange.endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick an end date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
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
                        <FormDescription>
                          Report end date (required)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Template Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Display & Format Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="template.showPercentages"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show Percentages</FormLabel>
                          <FormDescription>
                            Show percentage breakdowns in the report
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="template.showComparisons"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Show Period Comparisons</FormLabel>
                          <FormDescription>
                            Compare data with previous periods
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="template.includeSubtotals"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Include Subtotals</FormLabel>
                          <FormDescription>
                            Include subtotal calculations in sections
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Updating..." : "Update Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
