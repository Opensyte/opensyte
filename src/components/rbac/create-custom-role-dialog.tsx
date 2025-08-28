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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Shield, Info, Check, ChevronDown, ChevronRight } from "lucide-react";

interface CreateCustomRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  userId: string;
}

export function CreateCustomRoleDialog({
  open,
  onOpenChange,
  organizationId,
  userId,
}: CreateCustomRoleDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(
    new Set()
  );

  const utils = api.useUtils();

  // Get available permissions
  const { data: permissionGroups, isLoading: loadingPermissions } =
    api.customRoles.getAvailablePermissions.useQuery(
      {
        userId,
        organizationId,
      },
      { enabled: open }
    );

  // Create custom role mutation
  const createRoleMutation = api.customRoles.createCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role created successfully");
      onOpenChange(false);
      resetForm();
      void utils.customRoles.getOrganizationCustomRoles.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to create custom role");
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedPermissions([]);
    setCollapsedModules(new Set());
  };

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Please select at least one permission");
      return;
    }

    setIsCreating(true);
    await createRoleMutation.mutateAsync({
      userId,
      organizationId,
      name: name.trim(),
      description: description.trim() || undefined,
      color: "#3b82f6", // Default blue color
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
    if (!isCreating) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Create Custom Role
          </DialogTitle>
          <DialogDescription>
            Create a custom role with specific permissions tailored to your
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
                      className="border border-border rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-border bg-muted/30 rounded-t-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleModuleCollapse(group.module)}
                              className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded-md transition-colors"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleModulePermissions(modulePermissionIds)
                              }
                              className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-lg transition-colors group"
                            >
                              <div
                                className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${
                                  allSelected
                                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                    : selectedCount > 0
                                      ? "bg-primary/20 border-primary text-primary"
                                      : "border-muted-foreground group-hover:border-primary/50"
                                }`}
                              >
                                {allSelected && <Check className="h-3 w-3" />}
                                {selectedCount > 0 && !allSelected && (
                                  <div className="w-2 h-2 bg-primary rounded-sm" />
                                )}
                              </div>

                              <div className="flex-1 text-left">
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {group.label}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {group.permissions.length} permissions
                                  available
                                </p>
                              </div>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                selectedCount > 0 ? "default" : "outline"
                              }
                              className="text-xs font-medium"
                            >
                              {selectedCount}/{modulePermissionIds.length}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Content */}
                      {!isCollapsed && (
                        <div className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {group.permissions.map(permission => (
                              <label
                                key={permission.id}
                                className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 p-3 rounded-lg transition-all duration-150 border border-transparent hover:border-border group"
                              >
                                <Checkbox
                                  checked={selectedPermissions.includes(
                                    permission.id
                                  )}
                                  onCheckedChange={() =>
                                    togglePermission(permission.id)
                                  }
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors block truncate">
                                    {permission.name
                                      .replace(/:/g, ": ")
                                      .replace(/([a-z])([A-Z])/g, "$1 $2")
                                      .split(": ")
                                      .map((part, index) => (
                                        <span
                                          key={index}
                                          className={
                                            index === 0 ? "capitalize" : ""
                                          }
                                        >
                                          {part}
                                          {index === 0 ? ": " : ""}
                                        </span>
                                      ))}
                                  </span>
                                </div>
                              </label>
                            ))}
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
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isCreating || !name.trim() || selectedPermissions.length === 0
            }
            className="w-full sm:w-auto"
          >
            {isCreating ? "Creating..." : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
