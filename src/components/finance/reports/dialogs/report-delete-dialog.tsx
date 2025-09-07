import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface ReportDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  reportId: string;
  onDeleted: () => void;
}

/**
 * Confirmation dialog that displays report details and deletes a financial report.
 *
 * Renders a modal showing the report name and optional description, warns about
 * related data that will be removed, and performs the deletion when confirmed.
 * Fetches the report details only when the dialog is open and `reportId` is set.
 *
 * On confirm it runs a delete mutation, shows success or error toasts, disables
 * actions while in flight, invokes `onDeleted()` after a successful delete,
 * and closes the dialog via `onOpenChange(false)`.
 *
 * @param open - Controls whether the dialog is visible.
 * @param onOpenChange - Called to update the dialog open state.
 * @param organizationId - Organization identifier used for the delete request.
 * @param reportId - Financial report identifier to fetch and delete.
 * @param onDeleted - Callback invoked after a successful deletion.
 */
export function ReportDeleteDialog({
  open,
  onOpenChange,
  organizationId,
  reportId,
  onDeleted,
}: ReportDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { data: report } = api.financialReports.get.useQuery(
    { reportId },
    { enabled: open && !!reportId }
  );

  const deleteReport = api.financialReports.delete.useMutation();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteReport.mutateAsync({
        id: reportId,
        organizationId: organizationId,
      });
      toast.success("Report deleted successfully");
      onDeleted();
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Financial Report
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            financial report and all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">You are about to delete:</p>
                <p>
                  <span className="font-semibold">{report?.name}</span>
                  {report?.description && (
                    <>
                      <br />
                      <span className="text-xs">{report.description}</span>
                    </>
                  )}
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This will also delete:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All generated report data and versions</li>
              <li>Export history and scheduled reports</li>
              <li>Any automated scheduling configurations</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
