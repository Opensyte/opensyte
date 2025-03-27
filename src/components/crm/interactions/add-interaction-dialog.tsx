import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";

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
  }) => void;
  customers: Customer[];
}

export function AddInteractionDialog({
  isOpen,
  onOpenChange,
  onAddInteraction,
  customers,
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
  };

  // Handle form submission
  const handleSubmit = () => {
    onAddInteraction(formData);
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Interaction</DialogTitle>
          <DialogDescription>
            Record a new interaction with a customer. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customerId">Customer</Label>
            <Select
              value={formData.customerId}
              onValueChange={(value) =>
                setFormData({ ...formData, customerId: value })
              }
            >
              <SelectTrigger id="customerId" className="w-full">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName}{" "}
                    {customer.company ? `(${customer.company})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Interaction Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
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
              onValueChange={(value) =>
                setFormData({ ...formData, medium: value as InteractionMedium })
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

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Brief subject of interaction"
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scheduledAt">Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.scheduledAt && "text-muted-foreground",
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
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.scheduledAt ?? undefined}
                  onSelect={(date) =>
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
                    !formData.completedAt && "text-muted-foreground",
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
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.completedAt ?? undefined}
                  onSelect={(date) =>
                    date && setFormData({ ...formData, completedAt: date })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Detailed notes about the interaction"
              className="min-h-[120px] w-full"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Save Interaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
