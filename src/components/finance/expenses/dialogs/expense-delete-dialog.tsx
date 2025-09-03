"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ExpenseDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  expenseId?: string;
  onDeleted?: () => void;
}

export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  organizationId,
  expenseId,
  onDeleted,
}: ExpenseDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: expense } = api.expense.getById.useQuery(
    {
      id: expenseId!,
      organizationId,
    },
    {
      enabled: !!expenseId && open,
    }
  );

  const deleteMutation = api.expense.remove.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      onDeleted?.();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(error.message ?? "Failed to delete expense");
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    if (!expenseId) return;

    setIsDeleting(true);
    deleteMutation.mutate({
      id: expenseId,
      organizationId,
    });
  };

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false);
    }
  };

  const formatAmount = (value: unknown): string => {
    if (typeof value === "number") return value.toFixed(2);
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "toString" in value) {
      try {
        const s = (value as { toString(): string }).toString();
        return s;
      } catch {
        return "0.00";
      }
    }
    return "0.00";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Expense
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            expense from your records.
          </DialogDescription>
        </DialogHeader>

        {expense && (
          <div className="py-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {formatAmount(expense.amount)} {expense.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {new Date(expense.date).toLocaleDateString()}
                </span>
              </div>
              {expense.description && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Description:
                  </span>
                  <span className="font-medium">{expense.description}</span>
                </div>
              )}
              {expense.vendor && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{expense.vendor}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
