"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Shield,
  Info,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import type { CustomRoleWithPermissions } from "~/types/custom-roles";

interface EditCustomRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  userId: string;
  role: CustomRoleWithPermissions | null;
}

export function EditCustomRoleDialog({
  open,
  onOpenChange,
  organizationId,
  userId,
  role,
}: EditCustomRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(
    new Set()
  );
  const [ungrantablePermissions, setUngrantablePermissions] = useState<
    Set<string>
  >(new Set());

  const utils = api.useUtils();

  const toggleModuleCollapse = (moduleKey: string) => {
    setCollapsedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleKey)) {
        newSet.delete(moduleKey);
      } else {
        newSet.add(moduleKey);
      }
      return newSet;
    });
  };

  // Get available permissions with auto-sync
  const { data: permissionGroups, isLoading: loadingPermissions } =
    api.customRoles.getAvailablePermissions.useQuery(
      {
        userId,
        organizationId,
        autoSync: true, // Enable automatic permission synchronization
      },
      {
        enabled: open,
        // Refetch when dialog opens to ensure permissions are up to date
        refetchOnMount: true,
      }
    );

  // Update custom role mutation
  const updateRoleMutation = api.customRoles.updateCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role updated successfully");
      onOpenChange(false);
      void utils.customRoles.getOrganizationCustomRoles.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update custom role");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  // Initialize form when role changes
  useEffect(() => {
    if (role && open) {
      setName(role.name);
      setDescription(role.description ?? "");
      setSelectedPermissions(role.permissions?.map(p => p.permission.id) ?? []);
    }
  }, [role, open]);

  // Update ungrantable permissions when permission groups change
  useEffect(() => {
    if (permissionGroups) {
      const ungrantable = new Set<string>();
      permissionGroups.forEach(group => {
        // Only permissions NOT in grantablePermissions are ungrantable
        const grantableIds = new Set(group.permissions.map(p => p.id));
        group.permissions.forEach(permission => {
          if (!grantableIds.has(permission.id)) {
            ungrantable.add(permission.id);
          }
        });
      });
      setUngrantablePermissions(ungrantable);
    }
  }, [permissionGroups]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedPermissions([]);
  };

  const handleSubmit = async () => {
    if (!role) return;

    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    setIsUpdating(true);
    await updateRoleMutation.mutateAsync({
      userId,
      organizationId,
      roleId: role.id,
      name: name.trim(),
      description: description.trim() || undefined,
      color: role.color, // Keep existing color
      permissionIds: selectedPermissions,
    });
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleModulePermissions = (modulePermissions: string[]) => {
    const allSelected = modulePermissions.every(id =>
      selectedPermissions.includes(id)
    );
    if (allSelected) {
      // Deselect all permissions from this module
      setSelectedPermissions(prev =>
        prev.filter(id => !modulePermissions.includes(id))
      );
    } else {
      // Select all permissions from this module
      setSelectedPermissions(prev => [
        ...prev.filter(id => !modulePermissions.includes(id)),
        ...modulePermissions,
      ]);
    }
  };

  const handleClose = () => {
    if (!isUpdating) {
      onOpenChange(false);
      resetForm();
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Edit Custom Role
          </DialogTitle>
          <DialogDescription>
            Update the role&apos;s permissions and details to better fit your
            organization&apos;s needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Role Information
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name *</Label>
                <Input
                  id="role-name"
                  placeholder="e.g., Sales Coordinator"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={50}
                  className="max-w-md"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  placeholder="Describe what this role is responsible for..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="max-w-lg"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Permissions Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Permissions
              </h3>
              <Badge variant="outline" className="text-xs">
                {selectedPermissions.length} selected
              </Badge>
            </div>

            {loadingPermissions ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading permissions...
              </div>
            ) : (
              <div className="space-y-4">
                {permissionGroups?.map(group => {
                  const modulePermissionIds = group.permissions.map(p => p.id);
                  const selectedCount = modulePermissionIds.filter(id =>
                    selectedPermissions.includes(id)
                  ).length;
                  const allSelected =
                    selectedCount === modulePermissionIds.length;
                  const isCollapsed = collapsedModules.has(group.module);

                  return (
                    <div
                      key={group.module}
                      className="border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      {/* Collapsible Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
                        onClick={() => toggleModuleCollapse(group.module)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">
                              {group.label}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {group.permissions.length} permission
                              {group.permissions.length !== 1 ? "s" : ""}{" "}
                              available
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={selectedCount > 0 ? "default" : "outline"}
                            className="text-xs"
                          >
                            {selectedCount}/{modulePermissionIds.length}
                          </Badge>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              toggleModulePermissions(modulePermissionIds);
                            }}
                            className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors p-1 rounded hover:bg-background"
                          >
                            <div
                              className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                                allSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground hover:border-primary"
                              }`}
                            >
                              {allSelected && <Check className="h-3 w-3" />}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      {!isCollapsed && (
                        <div className="px-4 pb-4 border-t bg-muted/20">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
                            {group.permissions.map(permission => {
                              const isUngrantable = ungrantablePermissions.has(
                                permission.id
                              );
                              const isSelected = selectedPermissions.includes(
                                permission.id
                              );

                              const permissionElement = (
                                <label
                                  key={permission.id}
                                  className={`flex items-center space-x-2 cursor-pointer hover:bg-background/80 p-2 rounded-md transition-colors group ${
                                    isUngrantable
                                      ? "opacity-60 cursor-not-allowed"
                                      : ""
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => {
                                      if (!isUngrantable) {
                                        togglePermission(permission.id);
                                      }
                                    }}
                                    disabled={isUngrantable}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <span className="text-xs font-medium flex-1 group-hover:text-foreground transition-colors">
                                    {permission.name
                                      .replace(/:/g, ": ")
                                      .replace(/([a-z])([A-Z])/g, "$1 $2")}
                                  </span>
                                  {isUngrantable && (
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </label>
                              );

                              if (isUngrantable) {
                                return (
                                  <TooltipProvider key={permission.id}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        {permissionElement}
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="top"
                                        className="max-w-xs"
                                      >
                                        <p className="text-xs">
                                          You don&apos;t have permission to
                                          grant this.
                                          {permission.name.includes(
                                            "billing"
                                          ) &&
                                            " Only organization owners can grant billing permissions."}
                                          {permission.name.includes("admin") &&
                                            !permission.name.includes(
                                              "billing"
                                            ) &&
                                            " You need admin privileges to grant this permission."}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              }

                              return permissionElement;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPermissions.length === 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Please select at least one permission for this role.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isUpdating || !name.trim() || selectedPermissions.length === 0
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
