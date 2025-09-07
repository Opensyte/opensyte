"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import type { UserRole } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import {
  AlertTriangle,
  Trash2,
  Shield,
  Users,
  Database,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface DeleteOrganizationDialogProps {
  organization:
    | {
        id: string;
        name: string;
        description?: string | null;
        logo?: string | null;
        website?: string | null;
        industry?: string | null;
        membersCount: number;
        customersCount: number;
        projectsCount: number;
        tasksCount?: number;
        invoicesCount?: number;
        expensesCount?: number;
        createdAt: string;
        updatedAt: string;
        userRole: UserRole;
      }
    | null
    | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
  onSuccess,
}: DeleteOrganizationDialogProps) {
  const { data: session } = authClient.useSession();
  const [confirmationText, setConfirmationText] = useState("");
  const [step, setStep] = useState<"warning" | "confirm">("warning");

  const { mutate: deleteOrganization, isPending } =
    api.organization.delete.useMutation({
      onSuccess: () => {
        onSuccess();
        onOpenChange(false);
        setConfirmationText("");
        setStep("warning");
      },
      onError: error => {
        toast.error(`Failed to delete organization: ${error.message}`);
      },
    });

  const handleConfirmDeletion = () => {
    if (!session?.user?.id || !organization) {
      toast.error("Authentication required");
      return;
    }

    if (confirmationText !== organization.name) {
      toast.error("Organization name doesn't match");
      return;
    }

    deleteOrganization({
      id: organization.id,
      userId: session.user.id,
    });
  };

  const handleClose = () => {
    if (isPending) return; // Prevent closing during deletion
    onOpenChange(false);
    setConfirmationText("");
    setStep("warning");
  };

  const isConfirmationValid = confirmationText === organization?.name;

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-red-900 dark:text-red-100">
                Delete Organization
              </DialogTitle>
              <DialogDescription className="text-red-700 dark:text-red-300">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {step === "warning" && (
            <div className="space-y-4">
              {/* Warning Alert */}
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>Warning:</strong> Deleting &quot;{organization.name}
                  &quot; will permanently remove all data and immediately revoke
                  access for all team members.
                </AlertDescription>
              </Alert>

              {/* Impact Summary */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">This will delete:</h4>

                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.membersCount} team members</span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.customersCount} customers</span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.projectsCount} projects</span>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{organization.tasksCount ?? 0} tasks</span>
                  </div>
                </div>
              </div>

              {/* Additional Impact Details */}
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <h5 className="font-medium text-sm text-red-900 dark:text-red-100 mb-2">
                  Additional data that will be permanently deleted:
                </h5>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>
                    • All invoices and financial records (
                    {organization.invoicesCount ?? 0})
                  </li>
                  <li>• All expenses and expense categories</li>
                  <li>• All time entries and project resources</li>
                  <li>• All custom roles and permissions</li>
                  <li>• All comments and attachments</li>
                  <li>• All notification history</li>
                </ul>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Are you absolutely sure you want to continue?
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setStep("confirm")}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Yes, Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              {/* Final Confirmation */}
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>Final Step:</strong> Type the organization name
                  exactly to confirm deletion.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Type{" "}
                  <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                    {organization.name}
                  </code>{" "}
                  to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={e => setConfirmationText(e.target.value)}
                  placeholder={organization.name}
                  disabled={isPending}
                  className="font-mono"
                />

                {confirmationText && !isConfirmationValid && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Organization name doesn&apos;t match. Please type exactly:{" "}
                    {organization.name}
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep("warning")}
                  disabled={isPending}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Back
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDeletion}
                    disabled={!isConfirmationValid || isPending}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isPending ? "Deleting..." : "Delete Forever"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
