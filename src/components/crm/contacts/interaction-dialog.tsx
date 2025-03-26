'use client'
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { format } from "date-fns";

interface InteractionDialogProps {
  isOpen: boolean;
  leadId: string;
  leadName: string;
  onClose: () => void;
  onSave: (data: InteractionData) => void;
}

export interface InteractionData {
  leadId: string;
  type: string;
  date: Date;
  subject: string;
  notes: string;
}

export default function InteractionDialog({
  isOpen,
  leadId,
  leadName,
  onClose,
  onSave,
}: InteractionDialogProps) {
  const [date, setDate] = React.useState<Date>(new Date());
  const [type, setType] = React.useState<string>("CALL");
  const [subject, setSubject] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      leadId,
      type,
      date,
      subject,
      notes,
    });
    resetForm();
  };

  const resetForm = () => {
    setDate(new Date());
    setType("CALL");
    setSubject("");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Log Interaction with {leadName}</span>
          </DialogTitle>
          <DialogDescription>
            Record details about your interaction with this lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interaction-type">Interaction Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="interaction-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Phone Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interaction-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(date) => date && setDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-subject">Subject</Label>
              <Input
                id="interaction-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject of interaction"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interaction-notes">Notes</Label>
              <Textarea
                id="interaction-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter detailed notes about the interaction"
                className="min-h-[120px]"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Interaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
