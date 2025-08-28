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
import type { CustomRoleWithPermissions } from "~/types/custom-roles";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    userId: string;
    user: {
      name: string;
      email: string;
    };
    role: UserRole | null;
    customRoleId: string | null;
    customRole?: {
      id: string;
      name: string;
      description: string | null;
      color: string;
    } | null;
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
  // Single selected value that can be either predefined role or custom role ID
  const [selectedValue, setSelectedValue] = useState<string>(() => {
    if (member.customRoleId) return `custom:${member.customRoleId}`;
    if (member.role) return `predefined:${member.role}`;
    return "";
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const utils = api.useUtils();

  // Get custom roles for this organization
  const { data: customRoles } =
    api.customRoles.getOrganizationCustomRoles.useQuery({
      userId: currentUserId,
      organizationId,
    }) as { data: CustomRoleWithPermissions[] | undefined };

  const updateRoleMutation = api.customRoles.assignUserRole.useMutation({
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
    const currentValue = member.customRoleId
      ? `custom:${member.customRoleId}`
      : member.role
        ? `predefined:${member.role}`
        : "";

    // Check if there's actually a change
    if (selectedValue === currentValue) {
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);

    const [type, value] = selectedValue.split(":");

    if (!type || !value) {
      setIsUpdating(false);
      return;
    }

    const roleAssignment =
      type === "predefined"
        ? { type: "predefined" as const, role: value as UserRole }
        : type === "custom"
          ? { type: "custom" as const, customRoleId: value }
          : null;

    if (!roleAssignment) {
      setIsUpdating(false);
      return;
    }

    await updateRoleMutation.mutateAsync({
      userId: currentUserId,
      organizationId,
      targetUserId: member.userId,
      roleAssignment,
    });
  };

  // Get available roles that the current user can assign
  const availableRoles = Object.entries(ROLE_INFO).filter(([role]) =>
    canAssignRole(currentUserRole, role as UserRole)
  );

  // Check if user has permission to change roles at all
  const canChangeRoles = canManageRoles(currentUserRole);

  // Check if trying to assign a role that's not allowed
  const isValidAssignment = (() => {
    if (!selectedValue) return false;
    const [type, value] = selectedValue.split(":");
    return type === "predefined"
      ? canAssignRole(currentUserRole, value as UserRole)
      : type === "custom" && customRoles?.some(r => r.id === value);
  })();

  const getCurrentRoleInfo = () => {
    if (member.customRoleId && member.customRole?.name) {
      // Find the custom role from the API data to get permissions
      const customRoleWithPerms = customRoles?.find(
        r => r.id === member.customRoleId
      );
      return {
        name: member.customRole.name,
        description: member.customRole.description ?? "Custom role",
        type: "custom" as const,
        color: member.customRole.color ?? "bg-blue-100 text-blue-800",
        permissions:
          customRoleWithPerms?.permissions.map(p => p.permission.name) ?? [],
      };
    } else if (member.role) {
      return {
        name: ROLE_INFO[member.role]?.name ?? member.role,
        description: ROLE_INFO[member.role]?.description ?? "",
        type: "predefined" as const,
        permissions: ROLE_PERMISSIONS[member.role] ?? [],
        category: ROLE_INFO[member.role]?.category,
      };
    }
    return null;
  };

  const getSelectedRoleInfo = () => {
    if (!selectedValue) return null;

    const [type, value] = selectedValue.split(":");

    if (type === "custom") {
      const customRole = customRoles?.find(r => r.id === value);
      return customRole
        ? {
            name: customRole.name,
            description: customRole.description ?? "Custom role",
            type: "custom" as const,
            color: customRole.color,
            permissions: customRole.permissions.map(p => p.permission.name),
          }
        : null;
    } else if (type === "predefined") {
      const role = value as UserRole;
      return {
        name: ROLE_INFO[role]?.name ?? role,
        description: ROLE_INFO[role]?.description ?? "",
        type: "predefined" as const,
        permissions: ROLE_PERMISSIONS[role] ?? [],
        category: ROLE_INFO[role]?.category,
      };
    }
    return null;
  };

  const currentRoleInfo = getCurrentRoleInfo();
  const selectedRoleInfo = getSelectedRoleInfo();

  // Access denied dialog
  if (!canChangeRoles) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
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
          {!isValidAssignment && selectedValue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You cannot assign this role due to insufficient permissions or
                role hierarchy restrictions.
              </AlertDescription>
            </Alert>
          )}

          {/* Current user context */}
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

          {/* Current role display */}
          {currentRoleInfo && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Current Role
              </h3>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {currentRoleInfo.type === "predefined" ? (
                    <RoleBadge role={member.role!} />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: currentRoleInfo.color }}
                      />
                      <span className="text-sm font-medium">
                        {currentRoleInfo.name}
                      </span>
                    </div>
                  )}
                  {currentRoleInfo.type === "predefined" && (
                    <span className="text-sm font-medium">
                      {currentRoleInfo.name}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {currentRoleInfo.permissions.length} permissions
                  {currentRoleInfo.type === "predefined" &&
                    currentRoleInfo.category && (
                      <div className="mt-0.5">{currentRoleInfo.category}</div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Role selection */}
          <div className="space-y-3">
            <Label
              htmlFor="role-select"
              className="text-sm font-semibold text-foreground"
            >
              Select New Role
            </Label>
            <Select value={selectedValue} onValueChange={setSelectedValue}>
              <SelectTrigger id="role-select" className="w-full h-10">
                <SelectValue placeholder="Choose a role">
                  {selectedValue && selectedRoleInfo && (
                    <span className="text-sm">{selectedRoleInfo.name}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Predefined Roles Section */}
                {availableRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      Predefined Roles
                    </div>
                    {availableRoles.map(([role, info]) => (
                      <SelectItem key={role} value={`predefined:${role}`}>
                        <div className="w-full">
                          <p className="text-sm font-medium">{info.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {info.description}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* Custom Roles Section */}
                {customRoles && customRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      Custom Roles
                    </div>
                    {customRoles.map(role => (
                      <SelectItem key={role.id} value={`custom:${role.id}`}>
                        <div className="flex items-center w-full">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: role.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{role.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {role.description ?? "Custom role"}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* Empty state */}
                {availableRoles.length === 0 &&
                  (!customRoles || customRoles.length === 0) && (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No roles available to assign
                    </div>
                  )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected role information and permissions */}
          {selectedRoleInfo && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Role Details & Permissions
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {selectedRoleInfo.type === "predefined" ? (
                      <>
                        <span>Predefined Role</span>
                        {selectedRoleInfo.category && (
                          <>
                            <span>•</span>
                            <span>{selectedRoleInfo.category}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: selectedRoleInfo.color }}
                        />
                        <span>Custom Role</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Role description */}
                  <div className="lg:col-span-2 space-y-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <p className="text-sm leading-relaxed">
                        {selectedRoleInfo.description}
                      </p>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="lg:col-span-3 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Permissions ({selectedRoleInfo.permissions.length})
                    </p>
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <div className="max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {selectedRoleInfo.permissions.map(
                            (permission: string) => (
                              <div
                                key={permission}
                                className="flex items-center gap-2 text-xs px-2 py-1 bg-background rounded text-muted-foreground"
                              >
                                <div className="w-1 h-1 bg-green-500 rounded-full shrink-0" />
                                <span className="truncate">
                                  {permission
                                    .replace(/:/g, ": ")
                                    .replace(/([a-z])([A-Z])/g, "$1 $2")}
                                </span>
                              </div>
                            )
                          )}
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
            disabled={isUpdating || !isValidAssignment || !selectedValue}
            className="w-full sm:w-auto"
          >
            {isUpdating ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
