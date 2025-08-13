"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Calendar, Clock, User, FileText, CheckCircle } from "lucide-react";
import {
  timeOffTypeLabels,
  timeOffStatusLabels,
  timeOffStatusColors,
  type TimeOffDetailsDialogProps,
} from "~/types/hr";

// Props interface imported from centralized types

export function TimeOffDetailsDialog({
  open,
  onOpenChange,
  timeOff,
}: TimeOffDetailsDialogProps) {
  if (!timeOff) return null;

  const isApproved = timeOff.status === "APPROVED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time-Off Request Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this time-off request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {/* Status and Type */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              className={`capitalize ${timeOffStatusColors[timeOff.status]}`}
              variant="outline"
            >
              {timeOffStatusLabels[timeOff.status]}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {timeOffTypeLabels[timeOff.type]}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {timeOff.duration} {timeOff.duration === 1 ? "day" : "days"}
            </div>
          </div>

          {/* Employee Information */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Employee
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                <p className="font-medium">
                  {timeOff.employee.firstName} {timeOff.employee.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <p>{timeOff.employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Department
                </p>
                <p>{timeOff.employee.department ?? "No Department"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Position</p>
                <p>{timeOff.employee.position ?? "No Position"}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Time-Off Details */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Request
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Start Date
                </p>
                <p className="font-medium">
                  {format(timeOff.startDate, "EEEE, MMMM do, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">End Date</p>
                <p className="font-medium">
                  {format(timeOff.endDate, "EEEE, MMMM do, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Type</p>
                <Badge variant="outline" className="capitalize">
                  {timeOffTypeLabels[timeOff.type]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">
                  Total Duration
                </p>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {timeOff.duration} {timeOff.duration === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {timeOff.reason && (
            <>
              <Separator />
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                    Reason
                  </h3>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {timeOff.reason}
                </p>
              </section>
            </>
          )}

          {isApproved && timeOff.approvedAt && (
            <>
              <Separator />
              <section className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-medium tracking-wide text-green-700">
                    Approval
                  </h3>
                </div>
                <p className="text-sm text-green-700">
                  Approved on{" "}
                  {format(
                    timeOff.approvedAt,
                    "EEEE, MMMM do, yyyy 'at' h:mm a"
                  )}
                </p>
              </section>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-muted-foreground">
            <div>
              <p className="mb-0.5 font-medium text-[11px] uppercase tracking-wide text-muted-foreground/70">
                Created
              </p>
              <p>{format(timeOff.createdAt, "MMM dd, yyyy 'at' h:mm a")}</p>
            </div>
            <div>
              <p className="mb-0.5 font-medium text-[11px] uppercase tracking-wide text-muted-foreground/70">
                Last Updated
              </p>
              <p>{format(timeOff.updatedAt, "MMM dd, yyyy 'at' h:mm a")}</p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
