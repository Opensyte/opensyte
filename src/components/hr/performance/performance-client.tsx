"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { PermissionButton } from "~/components/shared/permission-button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { CalendarIcon, Filter, Plus, Shield } from "lucide-react";
import { reviewStatusLabels } from "~/types/hr";
import { PerformanceCreateDialog } from "./performance-create-dialog";
import { PerformanceEditDialog } from "./performance-edit-dialog";
import { PerformanceDetailsDialog } from "./performance-details-dialog";
import { PerformanceDeleteDialog } from "./performance-delete-dialog";
import { PerformanceStats } from "./performance-stats";
import { PerformanceTable } from "./performance-table";
import {
  PerformanceStatsSkeleton,
  PerformanceTableSkeleton,
} from "./performance-skeletons";
import { usePermissions } from "~/hooks/use-permissions";
import { authClient } from "~/lib/auth-client";

interface PerformanceClientProps {
  organizationId: string;
}

type ReviewStatusFilter = "all" | keyof typeof reviewStatusLabels;

export function PerformanceClient({ organizationId }: PerformanceClientProps) {
  // Authentication and permissions
  const { data: session } = authClient.useSession();
  const permissions = usePermissions({
    userId: session?.user.id ?? "",
    organizationId,
  });

  const [status, setStatus] = useState<ReviewStatusFilter>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [period, setPeriod] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<string>("");

  useEffect(() => {
    if (from && to && from > to) setTo(undefined);
  }, [from, to]);

  const utils = api.useUtils();

  const { data: stats, isLoading: loadingStats } =
    api.hr.getPerformanceReviewStats.useQuery(
      { organizationId },
      { enabled: !!organizationId }
    );
  const {
    data: reviews,
    isLoading,
    isFetching,
    error,
  } = api.hr.getPerformanceReviewsByOrganization.useQuery({
    organizationId,
    status: status === "all" ? undefined : status,
    from,
    to,
    period: period || undefined,
  });
  const { data: selected } = api.hr.getPerformanceReviewById.useQuery(
    { id: selectedId ?? "" },
    { enabled: !!selectedId }
  );

  const deleteMutation = api.hr.deletePerformanceReview.useMutation({
    onSuccess: async () => {
      toast.success("Performance review deleted");
      await utils.hr.getPerformanceReviewsByOrganization.invalidate();
      await utils.hr.getPerformanceReviewStats.invalidate();
    },
    onError: e =>
      toast.error(e.message ?? "Failed to delete performance review"),
  });

  const openDetails = (id: string) => {
    setSelectedId(id);
    setDetailsOpen(true);
  };
  const openEdit = (id: string) => {
    setSelectedId(id);
    setEditOpen(true);
  };
  const openDelete = (id: string, employeeName: string) => {
    setSelectedId(id);
    setDeleteEmployee(employeeName);
    setDeleteOpen(true);
  };
  const onDeleted = async () => {
    await utils.hr.getPerformanceReviewsByOrganization.invalidate();
    await utils.hr.getPerformanceReviewStats.invalidate();
  };

  const statusOptions = useMemo(
    () => ["all", ...Object.keys(reviewStatusLabels)] as const,
    []
  );

  // Permission check
  if (!permissions.canReadHR && !permissions.isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Performance Tracking
            </h1>
            <p className="text-muted-foreground mt-1">
              Track employee performance reviews and goals
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Access Restricted</p>
              <p className="text-muted-foreground">
                You don&apos;t have permission to view performance data. Please
                contact your administrator to request access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Performance Tracking
          </h1>
          <p className="text-muted-foreground mt-1">
            Track employee performance reviews and goals
          </p>
        </div>
        <PermissionButton
          userId={session?.user.id ?? ""}
          organizationId={organizationId}
          requiredPermission="write"
          module="hr"
          onClick={() => setCreateOpen(true)}
          className="w-full md:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> New Review
        </PermissionButton>
      </div>

      {loadingStats ? (
        <PerformanceStatsSkeleton />
      ) : (
        stats && <PerformanceStats stats={stats} />
      )}

      <Card className="col-span-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" /> Reviews
          </CardTitle>
          <CardDescription>
            Filter and manage performance reviews
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={status}
                onValueChange={v => setStatus(v as ReviewStatusFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => (
                    <SelectItem key={s} value={s}>
                      {s === "all"
                        ? "All Statuses"
                        : reviewStatusLabels[
                            s as keyof typeof reviewStatusLabels
                          ]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Period</label>
              <Input
                placeholder="e.g. 2025 Mid-Year"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              />
            </div>
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
                      {" "}
                      <CalendarIcon className="mr-2 h-4 w-4" />{" "}
                      {from ? (
                        format(from, "PPP")
                      ) : (
                        <span>Select date</span>
                      )}{" "}
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
              </div>
            </div>
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
                      {" "}
                      <CalendarIcon className="mr-2 h-4 w-4" />{" "}
                      {to ? format(to, "PPP") : <span>Select date</span>}{" "}
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
              </div>
            </div>
          </div>

          {reviews && reviews.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Showing {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </div>
          )}

          {!reviews && isLoading ? (
            <PerformanceTableSkeleton />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600">
              Failed to load performance reviews
            </div>
          ) : (
            <PerformanceTable
              reviews={reviews ?? []}
              onView={openDetails}
              onEdit={openEdit}
              onDelete={id => {
                const review = reviews?.find(r => r.id === id);
                if (review) {
                  openDelete(
                    id,
                    `${review.employee.firstName} ${review.employee.lastName}`
                  );
                }
              }}
              isDeleting={deleteMutation.isPending}
              userId={session?.user.id ?? ""}
              organizationId={organizationId}
            />
          )}
          {reviews && isFetching && (
            <div className="mt-2 text-xs text-muted-foreground">
              Updating results…
            </div>
          )}
        </CardContent>
      </Card>

      <PerformanceCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        onCreated={async () => {
          await utils.hr.getPerformanceReviewsByOrganization.invalidate();
          await utils.hr.getPerformanceReviewStats.invalidate();
        }}
      />
      <PerformanceEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        organizationId={organizationId}
        reviewId={selectedId ?? undefined}
        onUpdated={async () => {
          await utils.hr.getPerformanceReviewsByOrganization.invalidate();
          await utils.hr.getPerformanceReviewStats.invalidate();
        }}
      />
      <PerformanceDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        review={selected ?? null}
      />
      <PerformanceDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        organizationId={organizationId}
        reviewId={selectedId ?? undefined}
        reviewEmployee={deleteEmployee}
        onDeleted={onDeleted}
      />
    </div>
  );
}
