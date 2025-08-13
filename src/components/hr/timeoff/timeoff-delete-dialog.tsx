import { format } from "date-fns";
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
import { timeOffTypeLabels } from "~/types/hr";

interface TimeOffDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeOff: {
    id: string;
    type:
      | "VACATION"
      | "SICK"
      | "PERSONAL"
      | "BEREAVEMENT"
      | "MATERNITY"
      | "PATERNITY"
      | "UNPAID";
    startDate: Date;
    endDate: Date;
    employee: {
      firstName: string;
      lastName: string;
    };
  } | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export function TimeOffDeleteDialog({
  open,
  onOpenChange,
  timeOff,
  onConfirm,
  isLoading,
}: TimeOffDeleteDialogProps) {
  if (!timeOff) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Time-Off Request</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Are you sure you want to delete this time-off request? This
                action cannot be undone.
              </p>
              <div className="rounded-md border bg-muted/40 p-4">
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <p>
                    <span className="font-medium">Employee:</span>{" "}
                    {timeOff.employee.firstName} {timeOff.employee.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    {timeOffTypeLabels[timeOff.type]}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-medium">Dates:</span>{" "}
                    {format(timeOff.startDate, "MMM dd, yyyy")} -{" "}
                    {format(timeOff.endDate, "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:justify-end">
          <AlertDialogCancel disabled={isLoading} className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
