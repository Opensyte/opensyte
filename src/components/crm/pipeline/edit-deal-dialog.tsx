"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Slider } from "~/components/ui/slider";
import { LeadStatus } from "~/types/crm-enums";
import { cn } from "~/lib/utils";
import type { Deal } from "~/types/crm";
import { api } from "~/trpc/react";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters" }),
  value: z.coerce
    .number()
    .min(1, { message: "Value must be a positive number" }),
  customerId: z.string().cuid({ message: "Please select a customer" }),
  customerName: z.string().min(2, { message: "Customer name is required" }),
  status: z.nativeEnum(LeadStatus),
  stage: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  expectedCloseDate: z.date().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditDealDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function EditDealDialog({
  deal,
  open,
  onOpenChange,
  organizationId,
}: EditDealDialogProps) {
  // Fetch customers for the organization
  const { data: customers, isLoading: isLoadingCustomers } =
    api.contactsCrm.getContactsByOrganization.useQuery(
      { organizationId },
      { enabled: open } // Only fetch when dialog is open
    );
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: deal.title,
      value: deal.value,
      customerId: deal.customerId,
      customerName: deal.customerName,
      status: deal.status as LeadStatus,
      stage: deal.stage,
      probability: deal.probability ?? 50,
      description: deal.description,
      expectedCloseDate: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate)
        : undefined,
    },
  });

  // Update form values when deal changes
  useEffect(() => {
    form.reset({
      title: deal.title,
      value: deal.value,
      customerId: deal.customerId,
      customerName: deal.customerName,
      status: deal.status as LeadStatus,
      stage: deal.stage,
      probability: deal.probability ?? 50,
      description: deal.description,
      expectedCloseDate: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate)
        : undefined,
    });
  }, [deal, form]);

  // Update customer name when customer selection changes
  const watchedCustomerId = form.watch("customerId");

  useEffect(() => {
    if (watchedCustomerId && customers) {
      const selectedCustomer = customers.find(
        customer => customer.id === watchedCustomerId
      );
      if (selectedCustomer) {
        form.setValue(
          "customerName",
          `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
        );
      }
    }
  }, [watchedCustomerId, customers, form]);

  const utils = api.useUtils();
  const updateDealMutation = api.dealsCrm.updateDeal.useMutation({
    onSuccess: () => {
      toast.success("Deal updated successfully");
      onOpenChange(false);
      // Invalidate the deals query to refresh the pipeline
      void utils.dealsCrm.getDealsByOrganization.invalidate({ organizationId });
    },
    onError: error => {
      toast.error(`Failed to update deal: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    updateDealMutation.mutate({
      id: deal.id,
      organizationId,
      title: values.title,
      value: values.value,
      customerId: values.customerId,
      customerName: values.customerName,
      status: values.status,
      stage: values.stage,
      probability: values.probability,
      expectedCloseDate: values.expectedCloseDate,
      description: values.description ?? "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoadingCustomers}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCustomers ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Loading customers...</span>
                          </div>
                        ) : customers?.length ? (
                          customers.map(customer => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {`${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() ||
                                (customer.company ?? "Unnamed Customer")}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No customers found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Value ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(LeadStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

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
                            variant={"outline"}
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
              name="probability"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Win Probability: {value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[value]}
                      onValueChange={vals => onChange(vals[0])}
                      {...fieldProps}
                    />
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
                    <Textarea className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
                disabled={updateDealMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={updateDealMutation.isPending}
              >
                {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
