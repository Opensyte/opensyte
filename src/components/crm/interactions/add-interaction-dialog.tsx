import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
import { cn } from "~/lib/utils";
import type { Customer, InteractionType, InteractionMedium } from "~/types/crm";

interface AddInteractionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddInteraction: (formData: {
    customerId: string;
    type: InteractionType;
    medium: InteractionMedium;
    subject: string;
    content: string;
    scheduledAt: Date | null;
    completedAt: Date | null;
  }) => Promise<void>;
  customers: Customer[];
  isLoading: boolean;
}

export function AddInteractionDialog({
  isOpen,
  onOpenChange,
  onAddInteraction,
  customers,
  isLoading,
}: AddInteractionDialogProps) {
  const [formData, setFormData] = useState({
    customerId: "",
    type: "CALL" as InteractionType,
    medium: "PHONE" as InteractionMedium,
    subject: "",
    content: "",
    scheduledAt: null as Date | null,
    completedAt: null as Date | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form data on close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Reset form to default values
  const resetForm = () => {
    setFormData({
      customerId: "",
      type: "CALL",
      medium: "PHONE",
      subject: "",
      content: "",
      scheduledAt: null,
      completedAt: null,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerId) {
      newErrors.customerId = "Please select a customer";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddInteraction(formData);
      toast.success("Interaction added successfully");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error adding interaction:", error);
      toast.error("Failed to add interaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Interaction</DialogTitle>
          <DialogDescription>
            Record a new interaction with a customer. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customerId">Customer *</Label>
            <Select
              value={formData.customerId}
              onValueChange={value => {
                setFormData({ ...formData, customerId: value });
                if (errors.customerId) {
                  setErrors({ ...errors, customerId: "" });
                }
              }}
            >
              <SelectTrigger
                id="customerId"
                className={`w-full ${errors.customerId ? "border-destructive" : ""}`}
              >
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No customers available. Please add customers first.
                  </div>
                ) : (
                  customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName}{" "}
                      {customer.company ? `(${customer.company})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.customerId}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="type">Interaction Type</Label>
              <Select
                value={formData.type}
                onValueChange={value =>
                  setFormData({ ...formData, type: value as InteractionType })
                }
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="MEETING">Meeting</SelectItem>
                  <SelectItem value="NOTE">Note</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="medium">Medium</Label>
              <Select
                value={formData.medium}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    medium: value as InteractionMedium,
                  })
                }
              >
                <SelectTrigger id="medium" className="w-full">
                  <SelectValue placeholder="Select medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_PERSON">In Person</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="CHAT">Chat</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={e => {
                setFormData({ ...formData, subject: e.target.value });
                if (errors.subject) {
                  setErrors({ ...errors, subject: "" });
                }
              }}
              placeholder="Brief subject of interaction"
              className={`w-full ${errors.subject ? "border-destructive" : ""}`}
            />
            {errors.subject && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.subject}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="scheduledAt">Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.scheduledAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {formData.scheduledAt ? (
                      format(formData.scheduledAt, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.scheduledAt ?? undefined}
                    onSelect={date =>
                      date && setFormData({ ...formData, scheduledAt: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="completedAt">Completion Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.completedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {formData.completedAt ? (
                      format(formData.completedAt, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.completedAt ?? undefined}
                    onSelect={date =>
                      date && setFormData({ ...formData, completedAt: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={e => {
                setFormData({ ...formData, content: e.target.value });
                if (errors.content) {
                  setErrors({ ...errors, content: "" });
                }
              }}
              placeholder="Detailed notes about the interaction"
              className={`max-h-[200px] min-h-[80px] w-full sm:min-h-[120px] ${errors.content ? "border-destructive" : ""}`}
            />
            {errors.content && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.content}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="w-full sm:w-auto"
            disabled={isLoading || isSubmitting || customers.length === 0}
          >
            {isLoading || isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Interaction"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
