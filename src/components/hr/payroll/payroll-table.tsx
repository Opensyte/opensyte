"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  User,
  DollarSign,
} from "lucide-react";
import { payrollStatusLabels } from "~/types";
import { cn } from "~/lib/utils";

export interface PayrollRow {
  id: string;
  employee: { id: string; firstName: string; lastName: string } | null;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date;
  basicSalary: unknown;
  overtime: unknown;
  bonus: unknown;
  tax: unknown;
  deductions: unknown;
  netAmount: unknown;
  currency: string;
  status: keyof typeof payrollStatusLabels;
}

function formatMoney(value: unknown, currency: string) {
  if (value == null) return "-";
  let num: number | null = null;
  switch (typeof value) {
    case "number":
      num = Number.isFinite(value) ? value : null;
      break;
    case "string": {
      const parsed = Number.parseFloat(value);
      if (!Number.isNaN(parsed)) num = parsed;
      break;
    }
    case "bigint":
      num = Number(value);
      break;
    default:
      // Unsupported type for numeric formatting
      return "-";
  }
  if (num == null) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(num);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(d));
}

interface PayrollTableProps {
  data: PayrollRow[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function PayrollTable({
  data,
  onView,
  onEdit,
  onDelete,
  isDeleting = false,
}: PayrollTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const getStatusColor = (status: keyof typeof payrollStatusLabels) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "APPROVED":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "PAID":
        return "bg-green-100 text-green-700 border-green-300";
      case "CANCELLED":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "";
    }
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Employee
              </div>
            </TableHead>
            <TableHead className="font-semibold">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Pay Period
              </div>
            </TableHead>
            <TableHead className="font-semibold">Pay Date</TableHead>
            <TableHead className="font-semibold text-right">Basic</TableHead>
            <TableHead className="font-semibold text-right">Overtime</TableHead>
            <TableHead className="font-semibold text-right">Bonus</TableHead>
            <TableHead className="font-semibold text-right">Tax</TableHead>
            <TableHead className="font-semibold text-right">
              Deductions
            </TableHead>
            <TableHead className="font-semibold text-right">
              <div className="flex items-center justify-end gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Net Amount
              </div>
            </TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <DollarSign className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No payrolls found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create a payroll to get started
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map(row => (
              <TableRow
                key={row.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="py-4">
                  <div className="font-medium">
                    {row.employee
                      ? `${row.employee.firstName} ${row.employee.lastName}`
                      : "—"}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="text-sm">
                    {formatDate(row.payPeriodStart)} –{" "}
                    {formatDate(row.payPeriodEnd)}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <div className="text-sm font-medium">
                    {formatDate(row.payDate)}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-right tabular-nums">
                  {formatMoney(row.basicSalary, row.currency)}
                </TableCell>
                <TableCell className="py-4 text-right tabular-nums">
                  {formatMoney(row.overtime, row.currency)}
                </TableCell>
                <TableCell className="py-4 text-right tabular-nums">
                  {formatMoney(row.bonus, row.currency)}
                </TableCell>
                <TableCell className="py-4 text-right tabular-nums text-red-600">
                  {formatMoney(row.tax, row.currency)}
                </TableCell>
                <TableCell className="py-4 text-right tabular-nums text-orange-600">
                  {formatMoney(row.deductions, row.currency)}
                </TableCell>
                <TableCell className="py-4 text-right">
                  <span className="font-semibold text-green-600 tabular-nums">
                    {formatMoney(row.netAmount, row.currency)}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize font-medium",
                      getStatusColor(row.status)
                    )}
                  >
                    {payrollStatusLabels[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onView(row.id)}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(row.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(row.id)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setConfirmId(row.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!confirmId}
        onOpenChange={open => !open && setConfirmId(null)}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to permanently
              delete this payroll?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmId) onDelete(confirmId);
                setConfirmId(null);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
