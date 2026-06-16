"use client";

import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { api } from "~/trpc/react";

interface DeleteDealDialogProps {
  dealId: string;
  dealTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function DeleteDealDialog({
  dealId,
  dealTitle,
  open,
  onOpenChange,
  organizationId,
}: DeleteDealDialogProps) {
  const utils = api.useUtils();

  const deleteDealMutation = api.dealsCrm.deleteDeal.useMutation({
    onSuccess: () => {
      toast.success("Deal deleted successfully");
      onOpenChange(false);
      // Invalidate the deals query to refresh the pipeline
      void utils.dealsCrm.getDealsByOrganization.invalidate({ organizationId });
    },
    onError: error => {
      toast.error(`Failed to delete deal: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteDealMutation.mutate({
      id: dealId,
      organizationId,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>Delete deal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {dealTitle}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <AlertDialogCancel
            disabled={deleteDealMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteDealMutation.isPending}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
          >
            {deleteDealMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {deleteDealMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
