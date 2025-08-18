"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { reviewStatusLabels } from "~/types/hr";
import { format } from "date-fns";

interface PerformanceReviewWithEmployee {
  id: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    department?: string | null;
    position?: string | null;
  };
  reviewPeriod: string;
  reviewDate: Date;
  status: keyof typeof reviewStatusLabels;
  performanceScore?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  goals?: string | null;
  comments?: string | null;
}

interface PerformanceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: PerformanceReviewWithEmployee | null;
}

export function PerformanceDetailsDialog({
  open,
  onOpenChange,
  review,
}: PerformanceDetailsDialogProps) {
  if (!review) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Performance Review Details</DialogTitle>
          <DialogDescription>
            Review information for {review.employee.firstName}{" "}
            {review.employee.lastName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">Employee</p>
              <p className="font-medium">
                {review.employee.firstName} {review.employee.lastName}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">Department</p>
              <p>{review.employee.department ?? "—"}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">Period</p>
              <p>{review.reviewPeriod}</p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">Date</p>
              <p>{format(review.reviewDate, "PPP")}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant="secondary" className="capitalize">
                {reviewStatusLabels[review.status]}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">Score</p>
              <p className="font-medium">{review.performanceScore ?? "—"}</p>
            </div>
          </div>
          <Separator />
          {review.strengths && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Strengths
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {review.strengths}
              </p>
            </div>
          )}
          {review.improvements && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Improvements
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {review.improvements}
              </p>
            </div>
          )}
          {review.goals && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Goals
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {review.goals}
              </p>
            </div>
          )}
          {review.comments && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground">
                Comments
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {review.comments}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
