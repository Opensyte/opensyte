"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { reviewStatusLabels } from "~/types/hr";

const createSchema = z.object({
  employeeId: z.string().cuid({ message: "Employee is required" }),
  reviewerId: z.string().cuid({ message: "Reviewer is required" }),
  reviewPeriod: z.string().min(1, "Review period is required"),
  performanceScore: z.coerce
    .number()
    .min(0)
    .max(5)
    .optional()
    .or(z.literal(""))
    .transform(v => (v === "" ? undefined : v)),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  goals: z.string().optional(),
  comments: z.string().optional(),
  reviewDate: z.date({ required_error: "Review date is required" }),
  status: z
    .enum(["DRAFT", "SUBMITTED", "ACKNOWLEDGED", "COMPLETED"])
    .default("DRAFT"),
});

export type CreatePerformanceFormData = z.infer<typeof createSchema>;

interface PerformanceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: () => Promise<void> | void;
}

export function PerformanceCreateDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: PerformanceCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CreatePerformanceFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      employeeId: "",
      reviewerId: "",
      reviewPeriod: "",
      status: "DRAFT",
    },
  });

  const { data: employees, isLoading: loadingEmployees } =
    api.hr.getEmployeesByOrganization.useQuery(
      { organizationId },
      { enabled: !!organizationId && open }
    );

  const createMutation = api.hr.createPerformanceReview.useMutation({
    onSuccess: async () => {
      toast.success("Performance review created");
      form.reset();
      await onCreated();
      onOpenChange(false);
    },
    onError: e =>
      toast.error(e.message ?? "Failed to create performance review"),
    onSettled: () => setIsSubmitting(false),
  });

  const onSubmit = (data: CreatePerformanceFormData) => {
    setIsSubmitting(true);
    createMutation.mutate({ organizationId, ...data });
  };

  const handleOpenChange = (v: boolean) => {
    if (!isSubmitting) {
      onOpenChange(v);
      if (!v) form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>Create Performance Review</DialogTitle>
          <DialogDescription>
            Record a new performance review. * indicates required fields.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingEmployees || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map(e => (
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
                <FormField
                  control={form.control}
                  name="reviewerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reviewer *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingEmployees || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reviewer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map(e => (
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
                <FormField
                  control={form.control}
                  name="reviewPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Period *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Q1 2025"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="performanceScore"
                  render={({ field }) => {
                    const displayed =
                      field.value === undefined ? "" : String(field.value);
                    return (
                      <FormItem>
                        <FormLabel>Score (0-5)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min={0}
                            max={5}
                            placeholder="Optional"
                            disabled={isSubmitting}
                            value={displayed}
                            onChange={e => {
                              const v = e.target.value;
                              if (v === "") field.onChange(undefined);
                              else field.onChange(Number(v));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="reviewDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isSubmitting}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(reviewStatusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="strengths"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Strengths</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Key strengths..."
                          className="resize-none"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="improvements"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Areas for Improvement</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Areas to improve..."
                          className="resize-none"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Goals</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Set goals..."
                          className="resize-none"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Any additional notes..."
                          className="resize-none"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Review
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
