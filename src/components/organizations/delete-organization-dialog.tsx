"use client";

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

interface DeleteOrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  organizationName: string;
  isLoading?: boolean;
}

export function DeleteOrganizationDialog({
  isOpen,
  onClose,
  onConfirm,
  organizationName,
  isLoading = false,
}: DeleteOrganizationDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error deleting organization:", error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Organization</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete &quot;{organizationName}&quot;?
              This action cannot be undone. All data associated with this
              organization will be permanently deleted, including:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-sm">
              <li>All contacts and customer data</li>
              <li>Projects and tasks</li>
              <li>Invoices and financial records</li>
              <li>Team members and permissions</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:space-x-1">
          <AlertDialogCancel disabled={isLoading} className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
          >
            {isLoading ? "Deleting..." : "Delete Organization"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
