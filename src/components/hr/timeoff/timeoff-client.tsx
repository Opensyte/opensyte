"use client";

import { useMemo, useState, useEffect } from "react";
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
  Calendar as CalendarDays,
  X,
  ChevronDown,
  ChevronUp,
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
import {
  timeOffStatusLabels,
  timeOffTypeLabels,
  type TimeOffClientProps,
  type TimeOffStatusFilter,
  type TimeOffTypeFilter,
  TIME_OFF_STATUS_FILTERS,
  TIME_OFF_TYPE_FILTERS,
} from "~/types/hr";
import { TimeOffTable } from "./timeoff-table";
// Stats summary component
import { TimeOffStats } from "~/components/hr/timeoff/timeoff-stats";
import { TimeOffCreateDialog } from "./timeoff-create-dialog";
import { TimeOffEditDialog } from "./timeoff-edit-dialog";
import { TimeOffDetailsDialog } from "./timeoff-details-dialog";
import {
  TimeOffFiltersSkeleton,
  TimeOffStatsSkeleton,
  TimeOffTableSkeleton,
} from "./timeoff-skeletons";

export function TimeOffClient({ organizationId }: TimeOffClientProps) {
  const statuses = useMemo(() => TIME_OFF_STATUS_FILTERS, []);
  const types = useMemo(() => TIME_OFF_TYPE_FILTERS, []);

  const [statusFilter, setStatusFilter] = useState<TimeOffStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TimeOffTypeFilter>("all");
  const [from, setFrom] = useState<Date | undefined>(undefined);
  const [to, setTo] = useState<Date | undefined>(undefined);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTimeOffId, setSelectedTimeOffId] = useState<string | null>(
    null
  );
  const [showTypeBreakdown, setShowTypeBreakdown] = useState(false);

  const utils = api.useUtils();

  // Ensure from <= to and allow clearing dates gracefully
  useEffect(() => {
    if (from && to && from > to) {
      setTo(undefined);
    }
  }, [from, to]);

  const {
    data: timeOffRequests,
    isLoading,
    error,
  } = api.hr.getTimeOffByOrganization.useQuery(
    {
      organizationId,
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      from,
      to,
    },
    { enabled: !!organizationId }
  );

  const { data: timeOffStats } = api.hr.getTimeOffStats.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const { data: timeOffDetails } = api.hr.getTimeOffById.useQuery(
    { id: selectedTimeOffId ?? "" },
    { enabled: !!selectedTimeOffId }
  );

  const deleteMutation = api.hr.deleteTimeOff.useMutation({
    onSuccess: () => {
      toast.success("Time-off request deleted successfully");
      void utils.hr.getTimeOffByOrganization.invalidate();
      void utils.hr.getTimeOffStats.invalidate();
    },
    onError: err =>
      toast.error(err.message ?? "Failed to delete time-off request"),
  });

  const openDetails = (id: string) => {
    setSelectedTimeOffId(id);
    setDetailsOpen(true);
  };

  const openEdit = (id: string) => {
    setSelectedTimeOffId(id);
    setEditOpen(true);
  };

  const onDeleted = (id: string) => {
    deleteMutation.mutate({ id, organizationId });
  };

  const isStatusFilter = (v: string): v is TimeOffStatusFilter =>
    (statuses as readonly string[]).includes(v);
  const handleStatusChange = (value: string) => {
    if (isStatusFilter(value)) setStatusFilter(value);
  };

  const isTypeFilter = (v: string): v is TimeOffTypeFilter =>
    (types as readonly string[]).includes(v);
  const handleTypeChange = (value: string) => {
    if (isTypeFilter(value)) setTypeFilter(value);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Time-Off Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track employee time-off requests
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Compact Stats */}
      {isLoading ? (
        <TimeOffStatsSkeleton />
      ) : (
        <TimeOffStats stats={timeOffStats} />
      )}

      {/* Type Breakdown Toggle */}
      {timeOffStats && (
        <div className="rounded-md border bg-muted/20">
          <button
            type="button"
            onClick={() => setShowTypeBreakdown(v => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-muted/40"
          >
            <span>Time-Off Type Breakdown</span>
            {showTypeBreakdown ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showTypeBreakdown && (
            <div className="grid gap-2 px-4 pb-4 pt-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {timeOffStats.timeOffByType.map(item => (
                <div
                  key={item.type}
                  className="flex items-center justify-between rounded border bg-background px-3 py-2 text-xs md:text-sm"
                >
                  <span className="font-medium">
                    {
                      timeOffTypeLabels[
                        item.type as keyof typeof timeOffTypeLabels
                      ]
                    }
                  </span>
                  <span className="text-muted-foreground">
                    {item.totalDays}d • {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters + Table */}
      <Card className="col-span-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" /> Requests
          </CardTitle>
          <CardDescription>
            Filter and manage all time-off requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <TimeOffFiltersSkeleton />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses
                      .filter(s => s !== "all")
                      .map(s => (
                        <SelectItem key={s} value={s}>
                          {timeOffStatusLabels[s]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={typeFilter} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {types
                      .filter(t => t !== "all")
                      .map(t => (
                        <SelectItem key={t} value={t}>
                          {timeOffTypeLabels[t]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {/* From */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 w-full justify-start text-left font-normal",
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
              {/* To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-10 w-full justify-start text-left font-normal",
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
          )}

          {timeOffRequests && timeOffRequests.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Showing {timeOffRequests.length}{" "}
              {timeOffRequests.length === 1 ? "request" : "requests"}
            </div>
          )}

          {isLoading ? (
            <TimeOffTableSkeleton />
          ) : error ? (
            <div className="py-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <CalendarDays className="h-6 w-6 text-red-600" />
                <p className="text-sm font-medium text-red-800">
                  {(error instanceof Error ? error.message : undefined) ??
                    "Failed to load time-off requests"}
                </p>
                <p className="text-xs text-red-600">Please try again later.</p>
              </div>
            </div>
          ) : (
            <TimeOffTable
              data={timeOffRequests ?? []}
              onView={openDetails}
              onEdit={openEdit}
              onDelete={onDeleted}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TimeOffCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onCreated={() => {
          void utils.hr.getTimeOffByOrganization.invalidate();
          void utils.hr.getTimeOffStats.invalidate();
        }}
      />
      <TimeOffEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={organizationId}
        timeOffId={selectedTimeOffId ?? undefined}
        onUpdated={() => {
          void utils.hr.getTimeOffByOrganization.invalidate();
          void utils.hr.getTimeOffStats.invalidate();
        }}
      />
      <TimeOffDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        timeOff={timeOffDetails ?? null}
      />
    </div>
  );
}
