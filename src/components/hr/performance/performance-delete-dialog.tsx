"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
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
import { Loader2 } from "lucide-react";

interface PerformanceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  reviewId?: string;
  reviewEmployee?: string;
  onDeleted: () => Promise<void> | void;
}

export function PerformanceDeleteDialog({
  open,
  onOpenChange,
  organizationId,
  reviewId,
  reviewEmployee,
  onDeleted,
}: PerformanceDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = api.hr.deletePerformanceReview.useMutation({
    onSuccess: async () => {
      toast.success("Performance review deleted");
      await onDeleted();
      onOpenChange(false);
    },
    onError: e =>
      toast.error(e.message ?? "Failed to delete performance review"),
    onSettled: () => setIsDeleting(false),
  });

  const handleDelete = () => {
    if (!reviewId) return;
    setIsDeleting(true);
    deleteMutation.mutate({ id: reviewId, organizationId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Performance Review</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this performance review
            {reviewEmployee ? ` for ${reviewEmployee}` : ""}? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
          <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Review
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
