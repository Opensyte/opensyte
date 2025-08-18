"use client";

import { useState, useEffect } from "react";
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

const updateSchema = z.object({
  reviewPeriod: z.string().min(1, "Review period is required"),
  performanceScore: z.coerce
    .number()
    .min(0)
    .max(5)
    .optional()
    .or(z.literal(""))
    .transform(v => (v === "" ? undefined : v)),
  strengths: z.string().optional().nullable(),
  improvements: z.string().optional().nullable(),
  goals: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  reviewDate: z.date({ required_error: "Review date is required" }),
  status: z.enum(["DRAFT", "SUBMITTED", "ACKNOWLEDGED", "COMPLETED"]),
});

export type UpdatePerformanceFormData = z.infer<typeof updateSchema>;

interface PerformanceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  reviewId?: string;
  onUpdated: () => Promise<void> | void;
}

export function PerformanceEditDialog({
  open,
  onOpenChange,
  organizationId,
  reviewId,
  onUpdated,
}: PerformanceEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<UpdatePerformanceFormData>({
    resolver: zodResolver(updateSchema),
    defaultValues: { reviewPeriod: "", status: "DRAFT" },
  });

  const { data: review, isLoading } = api.hr.getPerformanceReviewById.useQuery(
    { id: reviewId ?? "" },
    { enabled: !!reviewId && open }
  );

  const updateMutation = api.hr.updatePerformanceReview.useMutation({
    onSuccess: async () => {
      toast.success("Performance review updated");
      await onUpdated();
      onOpenChange(false);
    },
    onError: e =>
      toast.error(e.message ?? "Failed to update performance review"),
    onSettled: () => setIsSubmitting(false),
  });

  useEffect(() => {
    if (review && open) {
      form.reset({
        reviewPeriod: review.reviewPeriod,
        performanceScore: review.performanceScore ?? undefined,
        strengths: review.strengths ?? undefined,
        improvements: review.improvements ?? undefined,
        goals: review.goals ?? undefined,
        comments: review.comments ?? undefined,
        reviewDate: new Date(review.reviewDate),
        status: review.status as UpdatePerformanceFormData["status"],
      });
    }
  }, [review, open, form]);

  const onSubmit = (data: UpdatePerformanceFormData) => {
    if (!reviewId) return;
    setIsSubmitting(true);
    updateMutation.mutate({ id: reviewId, organizationId, ...data });
  };

  const handleOpenChange = (v: boolean) => {
    if (!isSubmitting) {
      onOpenChange(v);
      if (!v) form.reset();
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[750px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>Edit Performance Review</DialogTitle>
          <DialogDescription>
            Update review details for {review.employee.firstName}{" "}
            {review.employee.lastName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="reviewPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Period *</FormLabel>
                      <FormControl>
                        <Input disabled={isSubmitting} {...field} />
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
                          className="resize-none"
                          disabled={isSubmitting}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          name={field.name}
                          ref={field.ref}
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
                          className="resize-none"
                          disabled={isSubmitting}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          name={field.name}
                          ref={field.ref}
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
                          className="resize-none"
                          disabled={isSubmitting}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          name={field.name}
                          ref={field.ref}
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
                          className="resize-none"
                          disabled={isSubmitting}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          name={field.name}
                          ref={field.ref}
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
                Update Review
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
