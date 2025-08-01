"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, PlusCircle } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "~/components/ui/textarea";
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
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "~/trpc/react";

// Schema for form validation with enhanced validation rules
const formSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters"),
  customerId: z.string().min(1, "Please select a customer"),
  value: z.coerce
    .number({ invalid_type_error: "Value must be a number" })
    .positive("Value must be greater than 0")
    .max(999999999, "Value cannot exceed $999,999,999"),
  status: z.string().min(1, "Please select a status"),
  probability: z.coerce
    .number({ invalid_type_error: "Probability must be a number" })
    .min(0, "Probability cannot be less than 0%")
    .max(100, "Probability cannot exceed 100%")
    .optional(),
  expectedCloseDate: z.date().optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDealDialogProps {
  organizationId: string;
}

export function AddDealDialog({ organizationId }: AddDealDialogProps) {
  const [open, setOpen] = useState(false);

  // tRPC queries and mutations
  const utils = api.useUtils();
  const { data: customers = [] } =
    api.contactsCrm.getContactsByOrganization.useQuery(
      { organizationId },
      {
        refetchOnWindowFocus: false,
        enabled: !!organizationId,
      }
    );

  const createDeal = api.dealsCrm.createDeal.useMutation({
    onSuccess: async () => {
      toast.success("Deal created successfully");
      await utils.dealsCrm.invalidate();
      setOpen(false);
      form.reset(defaultValues);
    },
    onError: error => {
      toast.error("Failed to create deal", {
        description: error.message,
      });
    },
  });

  const defaultValues: Partial<FormValues> = {
    title: "",
    customerId: "",
    value: 0,
    status: "NEW",
    probability: 50,
    description: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = (data: FormValues) => {
    createDeal.mutate({
      customerId: data.customerId,
      title: data.title,
      value: data.value,
      status: data.status as
        | "NEW"
        | "CONTACTED"
        | "QUALIFIED"
        | "PROPOSAL"
        | "NEGOTIATION"
        | "CLOSED_WON"
        | "CLOSED_LOST",
      stage: getStageFromStatus(data.status),
      probability: data.probability,
      currency: "USD",
      expectedCloseDate: data.expectedCloseDate,
      description: data.description,
    });
  };

  // Helper function to map status to stage number
  // Note: Stage must be at least 1 to match backend validation
  const getStageFromStatus = (status: string): number => {
    const stageMap: Record<string, number> = {
      NEW: 1, // Changed from 0 to 1
      CONTACTED: 2, // Incremented all stages by 1
      QUALIFIED: 3,
      PROPOSAL: 4,
      NEGOTIATION: 5,
      CLOSED_WON: 6,
      CLOSED_LOST: 7,
    };
    return stageMap[status] ?? 1; // Default to 1 instead of 0
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Deal</DialogTitle>
          <DialogDescription>
            Create a new deal in your sales pipeline.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter deal title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Enter deal value"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.firstName} {customer.lastName} -{" "}
                            {customer.company}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NEW">New Lead</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                        <SelectItem value="PROPOSAL">Proposal</SelectItem>
                        <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                        <SelectItem value="CLOSED_WON">Closed Won</SelectItem>
                        <SelectItem value="CLOSED_LOST">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Win Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Enter probability"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedCloseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Close Date</FormLabel>
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
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter deal description"
                      className="h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
                disabled={createDeal.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={createDeal.isPending}
              >
                {createDeal.isPending ? "Adding Deal..." : "Add Deal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
