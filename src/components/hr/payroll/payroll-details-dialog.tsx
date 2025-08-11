"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { payrollStatusLabels, type PayrollStatusType } from "~/types";

type PayrollDetails = {
  id: string;
  employee: { id: string; firstName: string; lastName: string } | null;
  payPeriodStart: Date | string;
  payPeriodEnd: Date | string;
  payDate: Date | string;
  basicSalary: string | number | null;
  overtime: string | number | null;
  bonus: string | number | null;
  tax: string | number | null;
  deductions: string | number | null;
  netAmount: string | number | null;
  currency: string;
  status: PayrollStatusType;
  notes: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll: PayrollDetails | null;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="sm:col-span-2 text-sm">{value ?? "—"}</div>
    </div>
  );
}

export function PayrollDetailsDialog({ open, onOpenChange, payroll }: Props) {
  const fmtDate = (d?: Date | string | null) => (d ? new Date(d) : null);
  const fmtMoney = (v: string | number | null | undefined, c: string) => {
    const num = typeof v === "number" ? v : v != null ? Number.parseFloat(v) : 0;
    if (v == null || Number.isNaN(num)) return "-";
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll Details</DialogTitle>
          <DialogDescription>Read-only view of payroll information.</DialogDescription>
        </DialogHeader>
        {!payroll ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No payroll selected.</div>
        ) : (
          <ScrollArea className="max-h-[70vh] pr-2">
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-lg font-semibold">
                  {payroll.employee ? `${payroll.employee.firstName} ${payroll.employee.lastName}` : "—"}
                </div>
                <Badge variant="outline" className="capitalize">
                  {payrollStatusLabels[payroll.status]}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Row label="Pay Date" value={fmtDate(payroll.payDate)?.toLocaleDateString() ?? "—"} />
                <Row label="Currency" value={payroll.currency} />
                <Row label="Period Start" value={fmtDate(payroll.payPeriodStart)?.toLocaleDateString() ?? "—"} />
                <Row label="Period End" value={fmtDate(payroll.payPeriodEnd)?.toLocaleDateString() ?? "—"} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Row label="Basic Salary" value={fmtMoney(payroll.basicSalary, payroll.currency)} />
                <Row label="Overtime" value={fmtMoney(payroll.overtime, payroll.currency)} />
                <Row label="Bonus" value={fmtMoney(payroll.bonus, payroll.currency)} />
                <Row label="Tax" value={fmtMoney(payroll.tax, payroll.currency)} />
                <Row label="Deductions" value={fmtMoney(payroll.deductions, payroll.currency)} />
                <Row label="Net Amount" value={fmtMoney(payroll.netAmount, payroll.currency)} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Notes</div>
                <div className="text-sm whitespace-pre-wrap">{payroll.notes ?? "—"}</div>
              </div>
            </div>
          </ScrollArea>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0">
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
