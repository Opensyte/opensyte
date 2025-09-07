"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    user: {
      name: string;
      email: string;
    };
    role: string | null;
    customRole?: {
      name: string;
    } | null;
  };
  currentUserId: string;
  organizationId: string;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  currentUserId,
  organizationId,
}: RemoveMemberDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const utils = api.useUtils();
  const removeMemberMutation = api.rbac.removeMember.useMutation({
    onSuccess: () => {
      toast.success(
        `${member.user.name} has been removed from the organization.`
      );
      void utils.rbac.getOrganizationMembers.invalidate();
      onOpenChange(false);
      setIsRemoving(false);
    },
    onError: error => {
      toast.error(error.message);
      setIsRemoving(false);
    },
  });

  const handleRemoveMember = async () => {
    setIsRemoving(true);
    try {
      await removeMemberMutation.mutateAsync({
        userId: currentUserId,
        organizationId,
        targetUserId: member.userId,
      });
    } catch {
      // Error handling is done in the mutation callbacks
    }
  };

  const getRoleDisplayName = () => {
    if (member.customRole?.name) {
      return member.customRole.name;
    }

    // Convert predefined role enum to display name
    const roleMap: Record<string, string> = {
      ORGANIZATION_OWNER: "Organization Owner",
      SUPER_ADMIN: "Super Admin",
      DEPARTMENT_MANAGER: "Department Manager",
      HR_MANAGER: "HR Manager",
      SALES_MANAGER: "Sales Manager",
      FINANCE_MANAGER: "Finance Manager",
      PROJECT_MANAGER: "Project Manager",
      EMPLOYEE: "Employee",
      CONTRACTOR: "Contractor",
      VIEWER: "Viewer",
    };

    return member.role ? (roleMap[member.role] ?? member.role) : "No Role";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Remove Team Member
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The member will lose all access to
            this organization.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>You are about to remove:</strong>
            <div className="mt-2 space-y-1">
              <div>
                <strong>Name:</strong> {member.user.name}
              </div>
              <div>
                <strong>Email:</strong> {member.user.email}
              </div>
              <div>
                <strong>Role:</strong> {getRoleDisplayName()}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemoveMember}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove Member"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
