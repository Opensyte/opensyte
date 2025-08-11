"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Plus,
  Filter,
  CalendarIcon,
  Banknote,
  TrendingUp,
  Clock,
  Receipt,
  X,
} from "lucide-react";
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
import { payrollStatusLabels } from "~/types";
import { PayrollTable } from "./payroll-table";
import { PayrollCreateDialog } from "./payroll-create-dialog";
import { PayrollEditDialog } from "./payroll-edit-dialog";
import { PayrollDetailsDialog } from "./payroll-details-dialog";
import {
  PayrollFiltersSkeleton,
  PayrollStatsSkeleton,
  PayrollTableSkeleton,
} from "./payroll-skeletons";

export function PayrollClient() {
  const params = useParams();
  const orgId = params.orgId as string;

  const statuses = useMemo(
    () => ["all", "DRAFT", "APPROVED", "PAID", "CANCELLED"] as const,
    []
  );
  type StatusFilter = (typeof statuses)[number];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<string | null>(
    null
  );

  const utils = api.useUtils();

  // Ensure from <= to and allow clearing dates gracefully
  useEffect(() => {
    if (from && to && from > to) {
      setTo(undefined);
    }
  }, [from, to]);

  const {
    data: payrolls,
    isLoading,
    error,
  } = api.hr.getPayrollsByOrganization.useQuery(
    {
      organizationId: orgId,
      status: statusFilter === "all" ? undefined : statusFilter,
      from,
      to,
    },
    { enabled: !!orgId }
  );

  const { data: payroll } = api.hr.getPayrollById.useQuery(
    { id: selectedPayrollId ?? "" },
    { enabled: !!selectedPayrollId }
  );

  const deleteMutation = api.hr.deletePayroll.useMutation({
    onSuccess: () => {
      toast.success("Payroll deleted successfully");
      void utils.hr.getPayrollsByOrganization.invalidate();
    },
    onError: err => toast.error(err.message ?? "Failed to delete payroll"),
  });

  const openDetails = (id: string) => {
    setSelectedPayrollId(id);
    setDetailsOpen(true);
  };

  const openEdit = (id: string) => {
    setSelectedPayrollId(id);
    setEditOpen(true);
  };

  const onDeleted = (id: string) => {
    deleteMutation.mutate({ id, organizationId: orgId });
  };

  const isStatusFilter = (v: string): v is StatusFilter =>
    (statuses as readonly string[]).includes(v);
  const handleStatusChange = (value: string) => {
    if (isStatusFilter(value)) setStatusFilter(value);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!payrolls) return { total: 0, draft: 0, approved: 0, paid: 0 };
    return {
      total: payrolls.length,
      draft: payrolls.filter(p => p.status === "DRAFT").length,
      approved: payrolls.filter(p => p.status === "APPROVED").length,
      paid: payrolls.filter(p => p.status === "PAID").length,
    };
  }, [payrolls]);

  // Map Decimal values to numbers for details dialog
  const detailsPayload = useMemo(() => {
    if (!payroll) return null;
    const toNum = (v: unknown) => {
      if (v == null) return null;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number.parseFloat(v);
        return Number.isNaN(n) ? null : n;
      }
      const anyV = v as { toNumber?: () => number; valueOf?: () => unknown };
      if (typeof anyV?.toNumber === "function") return anyV.toNumber();
      const val = anyV?.valueOf?.();
      if (typeof val === "number") return val;
      if (typeof val === "string") {
        const n = Number.parseFloat(val);
        return Number.isNaN(n) ? null : n;
      }
      return null;
    };
    return {
      id: payroll.id,
      employee: payroll.employee
        ? {
            id: payroll.employee.id,
            firstName: payroll.employee.firstName,
            lastName: payroll.employee.lastName,
          }
        : null,
      payPeriodStart: payroll.payPeriodStart,
      payPeriodEnd: payroll.payPeriodEnd,
      payDate: payroll.payDate,
      basicSalary: toNum(payroll.basicSalary),
      overtime: toNum(payroll.overtime),
      bonus: toNum(payroll.bonus),
      tax: toNum(payroll.tax),
      deductions: toNum(payroll.deductions),
      netAmount: toNum(payroll.netAmount),
      currency: payroll.currency,
      status: payroll.status,
      notes: payroll.notes,
    } as const;
  }, [payroll]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Payroll Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage employee payrolls and compensation
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => setCreateOpen(true)}
            size="default"
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Payroll
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <PayrollStatsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Payrolls
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Draft
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.draft}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Approved
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.approved}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Paid
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.paid}</p>
                </div>
                <Banknote className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {isLoading ? (
        <PayrollFiltersSkeleton />
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter payrolls by status and date range
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All" : payrollStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium">
                  From Date
                </label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal h-10 w-full",
                          !from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {from ? format(from, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={from}
                        onSelect={setFrom}
                        disabled={date => (to ? date > to : false)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {from && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setFrom(undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <label className="mb-2 block text-sm font-medium">
                  To Date
                </label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal h-10 w-full",
                          !to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {to ? format(to, "PPP") : <span>Select date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={to}
                        onSelect={setTo}
                        disabled={date => (from ? date < from : false)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {to && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setTo(undefined)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payroll Records</h2>
          {payrolls && payrolls.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {payrolls.length}{" "}
              {payrolls.length === 1 ? "record" : "records"}
            </p>
          )}
        </div>

        {isLoading ? (
          <PayrollTableSkeleton />
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-red-100 p-3">
                  <Receipt className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-sm font-medium text-red-800">
                  {(error instanceof Error ? error.message : undefined) ??
                    "Failed to load payrolls"}
                </p>
                <p className="text-xs text-red-600">
                  Please try refreshing the page or contact support if the issue
                  persists.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PayrollTable
            data={payrolls ?? []}
            onView={openDetails}
            onEdit={openEdit}
            onDelete={onDeleted}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </div>

      {/* Dialogs */}
      <PayrollCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={orgId}
        onCreated={() => void utils.hr.getPayrollsByOrganization.invalidate()}
      />

      <PayrollEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={orgId}
        payrollId={selectedPayrollId ?? undefined}
        onUpdated={() => void utils.hr.getPayrollsByOrganization.invalidate()}
      />

      <PayrollDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        payroll={detailsPayload}
      />
    </div>
  );
}
