"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, PlusCircle, Target } from "lucide-react";

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
import { Separator } from "~/components/ui/separator";
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
import { usePermissions } from "~/hooks/use-permissions";

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
  userId: string;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

export function AddDealDialog({ organizationId, userId }: AddDealDialogProps) {
  const [open, setOpen] = useState(false);

  // Permission checks - call hooks first
  const permissions = usePermissions({ userId, organizationId });

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
    status: "IDENTIFIED",
    probability: 50,
    description: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = (data: FormValues) => {
    createDeal.mutate({
      organizationId,
      customerId: data.customerId,
      title: data.title,
      value: data.value,
      status: data.status as
        | "IDENTIFIED"
        | "CONNECTION_SENT"
        | "CONNECTED"
        | "MESSAGED"
        | "IN_CONVERSATION"
        | "CALL_BOOKED"
        | "PROPOSAL_SENT"
        | "WON"
        | "LOST",
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
      IDENTIFIED: 1,
      CONNECTION_SENT: 2,
      CONNECTED: 3,
      MESSAGED: 4,
      IN_CONVERSATION: 5,
      CALL_BOOKED: 6,
      PROPOSAL_SENT: 7,
      WON: 8,
      LOST: 9,
    };
    return stageMap[status] ?? 1; // Default to 1 instead of 0
  };

  // Don't render the component if user doesn't have write permissions
  if (!permissions.canWriteCRM) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Deal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[620px]">
        <DialogHeader className="space-y-0 border-b p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Add New Deal</DialogTitle>
              <DialogDescription>
                Create a new deal in your sales pipeline.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6 p-6">
              {/* Deal details */}
              <section className="space-y-3">
                <SectionLabel>Deal</SectionLabel>
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
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
              </section>

              <Separator />

              {/* Pipeline */}
              <section className="space-y-3">
                <SectionLabel>Pipeline</SectionLabel>
                <div className="grid gap-4 sm:grid-cols-2">
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
                            <SelectItem value="IDENTIFIED">Identified</SelectItem>
                            <SelectItem value="CONNECTION_SENT">
                              Connection Sent
                            </SelectItem>
                            <SelectItem value="CONNECTED">Connected</SelectItem>
                            <SelectItem value="MESSAGED">Messaged</SelectItem>
                            <SelectItem value="IN_CONVERSATION">
                              In Conversation
                            </SelectItem>
                            <SelectItem value="CALL_BOOKED">
                              Call Booked
                            </SelectItem>
                            <SelectItem value="PROPOSAL_SENT">
                              Proposal Sent
                            </SelectItem>
                            <SelectItem value="WON">Won</SelectItem>
                            <SelectItem value="LOST">Lost</SelectItem>
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
                      <FormItem className="flex flex-col sm:col-span-2">
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
              </section>

              <Separator />

              {/* Description */}
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
            </div>
            <DialogFooter className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end sm:gap-2 sm:p-6">
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
                {createDeal.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {createDeal.isPending ? "Adding Deal..." : "Add Deal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
