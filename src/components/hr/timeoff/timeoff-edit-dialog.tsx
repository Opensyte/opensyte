"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "~/components/ui/textarea";
import { Calendar } from "~/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  timeOffTypeLabels,
  timeOffStatusLabels,
  type TimeOffEditDialogProps,
  type UpdateTimeOffFormData,
  updateTimeOffSchema,
} from "~/types/hr";
import { Separator } from "~/components/ui/separator";

// Validation schema and types imported from centralized types

export function TimeOffEditDialog({
  open,
  onOpenChange,
  organizationId,
  timeOffId,
  onUpdated,
}: TimeOffEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateTimeOffFormData>({
    resolver: zodResolver(updateTimeOffSchema),
    defaultValues: {
      type: "VACATION",
      reason: "",
      status: "PENDING",
    },
  });

  const { data: timeOff, isLoading: isLoadingTimeOff } =
    api.hr.getTimeOffById.useQuery(
      { id: timeOffId ?? "" },
      { enabled: !!timeOffId && open }
    );

  const updateMutation = api.hr.updateTimeOff.useMutation({
    onSuccess: () => {
      toast.success("Time-off request updated successfully");
      onUpdated();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update time-off request");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Load data into form when timeOff data is available
  useEffect(() => {
    if (timeOff && open) {
      form.reset({
        type: timeOff.type,
        startDate: new Date(timeOff.startDate),
        endDate: new Date(timeOff.endDate),
        reason: timeOff.reason ?? "",
        status: timeOff.status,
      });
    }
  }, [timeOff, open, form]);

  const onSubmit = async (data: UpdateTimeOffFormData) => {
    if (!timeOffId) return;

    setIsSubmitting(true);
    updateMutation.mutate({
      id: timeOffId,
      organizationId,
      ...data,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  // Calculate duration when dates change
  const startDate = form.watch("startDate") as Date | undefined;
  const endDate = form.watch("endDate") as Date | undefined;

  const duration =
    startDate && endDate
      ? Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  if (isLoadingTimeOff) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!timeOff) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Time-Off Request</DialogTitle>
          <DialogDescription>
            Update the time-off request details for {timeOff.employee.firstName}{" "}
            {timeOff.employee.lastName}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Employee Snapshot */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Employee
              </h3>
              <div className="rounded-md border bg-muted/40 p-4 text-sm grid gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Name</p>
                  <p className="font-medium">
                    {timeOff.employee.firstName} {timeOff.employee.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">
                    Department
                  </p>
                  <p>{timeOff.employee.department ?? "No Department"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">
                    Position
                  </p>
                  <p>{timeOff.employee.position ?? "No Position"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Main Fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Request Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(timeOffTypeLabels).map(
                            ([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            )
                          )}
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
                          {Object.entries(timeOffStatusLabels).map(
                            ([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
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
                            disabled={date =>
                              endDate ? date > endDate : false
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* End Date */}
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
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
                            disabled={date =>
                              startDate ? date < startDate : false
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

            {/* Duration */}
            <div className="rounded-md border bg-muted/40 p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">
                {duration > 0
                  ? `${duration} ${duration === 1 ? "day" : "days"}`
                  : "—"}
              </span>
            </div>

            <Separator />

            {/* Reason */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Reason (Optional)
              </h3>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Optional reason for the time-off request..."
                        className="resize-none"
                        rows={4}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:justify-end">
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
                Update Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
