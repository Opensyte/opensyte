"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
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
import type { InvoiceDeleteDialogProps } from "~/types";

export function InvoiceDeleteDialog({
  open,
  onOpenChange,
  organizationId,
  invoiceId,
  onDeleted,
}: InvoiceDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const utils = api.useUtils();

  const { data: invoice } = api.invoice.getInvoiceById.useQuery(
    { id: invoiceId! },
    { enabled: !!invoiceId }
  );

  const deleteMutation = api.invoice.deleteInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      void utils.invoice.listInvoices.invalidate();
      onDeleted?.();
      onOpenChange(false);
    },
    onError: err => {
      toast.error(err.message ?? "Failed to delete invoice");
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    if (!invoiceId) return;

    setIsDeleting(true);
    deleteMutation.mutate({
      id: invoiceId,
      organizationId,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice{" "}
            {invoice?.invoiceNumber
              ? `"${invoice.invoiceNumber}"`
              : "this invoice"}
            ? This action cannot be undone and will permanently remove the
            invoice and all associated items.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
          <AlertDialogCancel className="w-full sm:w-auto" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600 sm:w-auto"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
