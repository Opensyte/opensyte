"use client";

import React from "react";
import { toast } from "sonner";
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
          <AlertDialogTitle>Delete Deal</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the deal &quot;{dealTitle}&quot;?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <AlertDialogCancel
            disabled={deleteDealMutation.isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteDealMutation.isPending}
            className="w-full sm:w-auto"
          >
            {deleteDealMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
