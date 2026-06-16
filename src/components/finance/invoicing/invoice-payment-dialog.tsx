"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
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
import { formatCurrency } from "~/lib/invoice/format";

const METHODS = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "Other" },
] as const;

type Method = (typeof METHODS)[number]["value"];

interface InvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  invoiceId: string;
  currency: string;
  balanceDue: number;
  onRecorded?: () => void;
}

export function InvoicePaymentDialog({
  open,
  onOpenChange,
  organizationId,
  invoiceId,
  currency,
  balanceDue,
  onRecorded,
}: InvoicePaymentDialogProps) {
  const [amount, setAmount] = useState<number>(balanceDue);
  const [method, setMethod] = useState<Method>("BANK_TRANSFER");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [sendReceipt, setSendReceipt] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(balanceDue);
      setMethod("BANK_TRANSFER");
      setPaymentDate(new Date());
      setReference("");
      setNotes("");
      setSendReceipt(false);
    }
  }, [open, balanceDue]);

  const mutation = api.invoice.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      onRecorded?.();
      onOpenChange(false);
    },
    onError: e => toast.error(e.message ?? "Failed to record payment"),
  });

  const submit = () => {
    if (!(amount > 0)) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    mutation.mutate({
      id: invoiceId,
      organizationId,
      amount,
      method,
      paymentDate,
      reference: reference || undefined,
      notes: notes || undefined,
      sendReceipt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Balance due: {formatCurrency(balanceDue, currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <Label>Amount ({currency})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={Number.isFinite(amount) ? amount : ""}
              onChange={e => setAmount(parseFloat(e.target.value))}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={v => setMethod(v as Method)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    {format(paymentDate, "PP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={d => d && setPaymentDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Reference</Label>
            <Input
              placeholder="Transaction ID / reference (optional)"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Note</Label>
            <Textarea
              rows={2}
              placeholder="Optional"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Email receipt</Label>
              <p className="text-xs text-muted-foreground">
                Send a payment-received email to the client
              </p>
            </div>
            <Switch checked={sendReceipt} onCheckedChange={setSendReceipt} />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            className="w-full sm:w-auto"
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
