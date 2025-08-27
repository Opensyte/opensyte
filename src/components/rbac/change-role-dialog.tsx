"use client";

import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { RoleBadge } from "./role-badge";
import {
  ROLE_INFO,
  ROLE_PERMISSIONS,
  canAssignRole,
  canManageRoles,
} from "~/lib/rbac";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { AlertTriangle, Shield, User, Lock } from "lucide-react";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    user: {
      name: string;
      email: string;
    };
    role: UserRole;
  };
  currentUserRole: UserRole;
  currentUserId: string;
  organizationId: string;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  currentUserRole,
  currentUserId,
  organizationId,
}: ChangeRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role);
  const [isUpdating, setIsUpdating] = useState(false);

  const utils = api.useUtils();

  const updateRoleMutation = api.rbac.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      onOpenChange(false);
      void utils.rbac.getOrganizationMembers.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update role");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleUpdateRole = async () => {
    if (selectedRole === member.role) {
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);
    await updateRoleMutation.mutateAsync({
      userId: currentUserId,
      organizationId,
      targetUserId: member.userId,
      newRole: selectedRole,
    });
  };

  // Get available roles that the current user can assign
  const availableRoles = Object.entries(ROLE_INFO).filter(([role]) =>
    canAssignRole(currentUserRole, role as UserRole)
  );

  // Check if user has permission to change roles at all
  const canChangeRoles = canManageRoles(currentUserRole);

  // Check if trying to assign a role that's not allowed
  const isValidAssignment = canAssignRole(currentUserRole, selectedRole);

  const selectedRoleInfo = ROLE_INFO[selectedRole];
  const selectedRolePermissions = ROLE_PERMISSIONS[selectedRole] ?? [];

  // Access denied dialog
  if (!canChangeRoles) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Access Denied
            </DialogTitle>
            <DialogDescription>
              You don&apos;t have sufficient permissions to change user roles.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Only organization-level roles (Organization Owner, Super Admin,
              Department Manager) can manage team member roles.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Change Role for {member.user.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update the role and permissions for {member.user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invalid assignment warning */}
          {selectedRole !== member.role && !isValidAssignment && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You cannot assign this role due to insufficient permissions or
                role hierarchy restrictions.
              </AlertDescription>
            </Alert>
          )}

          {/* Current user context - more compact */}
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Your Current Role</p>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={currentUserRole} />
                <span className="text-xs text-muted-foreground">
                  {ROLE_INFO[currentUserRole]?.description}
                </span>
              </div>
            </div>
          </div>

          {/* Role selection - improved layout */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Role Assignment
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current role - simplified */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">
                  Current Role
                </Label>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                  <RoleBadge role={member.role} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {ROLE_INFO[member.role]?.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {ROLE_INFO[member.role]?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* New role selection - improved */}
              <div className="space-y-3">
                <Label
                  htmlFor="role-select"
                  className="text-sm font-medium text-muted-foreground"
                >
                  New Role
                </Label>
                <Select
                  value={selectedRole}
                  onValueChange={value => setSelectedRole(value as UserRole)}
                >
                  <SelectTrigger id="role-select" className="w-full">
                    <SelectValue>
                      <div className="flex items-center gap-3">
                        <div className="text-left min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {ROLE_INFO[selectedRole]?.name}
                          </p>
                        </div>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(([role, info]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-3 w-full">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{info.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {info.description}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Role information and permissions - improved layout */}
          {selectedRoleInfo && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Role Details & Permissions
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Role details - more compact */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Role Information
                    </h4>
                    <div className="space-y-2 p-3 border rounded-lg bg-background">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Category
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedRoleInfo.category}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Access Level
                        </span>
                        <p className="text-sm mt-1 leading-relaxed">
                          {selectedRoleInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions - spans 2 columns on large screens */}
                  <div className="lg:col-span-2 space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Permissions ({selectedRolePermissions.length})
                    </h4>
                    <div className="p-3 border rounded-lg bg-background">
                      <div className="max-h-40 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {selectedRolePermissions.map(permission => (
                            <div
                              key={permission}
                              className="flex items-center gap-2 text-xs px-2 py-1.5 bg-muted/50 rounded"
                            >
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                              <span className="truncate">
                                {permission
                                  .replace(/:/g, ": ")
                                  .replace(/([a-z])([A-Z])/g, "$1 $2")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRole}
            disabled={
              isUpdating || selectedRole === member.role || !isValidAssignment
            }
            className="w-full sm:w-auto"
          >
            {isUpdating ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
