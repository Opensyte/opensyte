"use client";

import { useState } from "react";
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
  type TimeOffCreateDialogProps,
  type CreateTimeOffFormData,
  createTimeOffSchema,
} from "~/types/hr";
import { Separator } from "~/components/ui/separator";

// Validation schema and types imported from centralized types

export function TimeOffCreateDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: TimeOffCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTimeOffFormData>({
    resolver: zodResolver(createTimeOffSchema),
    defaultValues: {
      employeeId: "",
      type: "VACATION",
      reason: "",
    },
  });

  const { data: employees, isLoading: isLoadingEmployees } =
    api.hr.getEmployeesByOrganization.useQuery(
      { organizationId },
      { enabled: !!organizationId && open }
    );

  const createMutation = api.hr.createTimeOff.useMutation({
    onSuccess: () => {
      toast.success("Time-off request created successfully");
      form.reset();
      onCreated();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(error.message ?? "Failed to create time-off request");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: CreateTimeOffFormData) => {
    setIsSubmitting(true);
    createMutation.mutate({
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Time-Off Request</DialogTitle>
          <DialogDescription>
            Submit a new time-off request for an employee. All fields marked
            with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* General Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                  General
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Employee */}
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Employee *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingEmployees || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select an employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map(employee => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName} -{" "}
                              {employee.department ?? "No Department"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                {/* Duration Display */}
                <div className="flex items-end">
                  <div className="w-full">
                    <FormLabel>Duration</FormLabel>
                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted/40 text-sm">
                      {duration > 0
                        ? `${duration} ${duration === 1 ? "day" : "days"}`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Dates
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
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
                              date < new Date() ||
                              (endDate ? date > endDate : false)
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
                              date < new Date() ||
                              (startDate ? date < startDate : false)
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

            <Separator />

            {/* Reason */}
            <div className="space-y-4">
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
                Create Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
