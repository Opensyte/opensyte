"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CreateCustomRoleDialog } from "./create-custom-role-dialog";
import { EditCustomRoleDialog } from "./edit-custom-role-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Shield,
  Users,
  Sparkles,
  Edit,
  Trash2,
  Info,
} from "lucide-react";
import { canManageCustomRoles } from "~/lib/custom-rbac";
import type { ExtendedUserOrganization } from "~/types/custom-roles";

type CustomRoleWithStats = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  permissions: {
    permission: {
      id: string;
      name: string;
      description: string | null;
      module: string;
      action: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }[];
  _count: {
    userAssignments: number;
  };
  permissionCount: number;
  userCount: number;
};

interface CustomRoleManagementProps {
  organizationId: string;
  userId: string;
  userOrg: ExtendedUserOrganization;
}

export function CustomRoleManagement({
  organizationId,
  userId,
  userOrg,
}: CustomRoleManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRoleWithStats | null>(
    null
  );
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const utils = api.useUtils();

  // Check permissions
  const canManageRoles = canManageCustomRoles(userOrg);

  // Get custom roles
  const { data: customRoles, isLoading } =
    api.customRoles.getOrganizationCustomRoles.useQuery({
      userId,
      organizationId,
    }) as {
      data: CustomRoleWithStats[] | undefined;
      isLoading: boolean;
    };

  // Delete custom role mutation
  const deleteRoleMutation = api.customRoles.deleteCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role deleted successfully");
      void utils.customRoles.getOrganizationCustomRoles.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to delete custom role");
    },
  });

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setRoleToDelete({ id: roleId, name: roleName });
    setShowDeleteDialog(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      await deleteRoleMutation.mutateAsync({
        userId,
        organizationId,
        roleId: roleToDelete.id,
      });
      setShowDeleteDialog(false);
      setRoleToDelete(null);
    } catch (error) {
      // Error handling is done in the mutation onError callback
      console.error("Failed to delete role:", error);
    }
  };

  if (!canManageRoles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Custom Roles
          </CardTitle>
          <CardDescription>
            Create and manage custom roles with specific permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to manage custom roles. Contact
              your organization administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Custom Roles
              </CardTitle>
              <CardDescription>
                Create and manage custom roles with specific permissions
                tailored to your organization
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading custom roles...
            </div>
          ) : customRoles && customRoles.length > 0 ? (
            <div className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-background">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Total Roles</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {customRoles.length}
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-background">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Users Assigned</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {customRoles.reduce((sum, role) => sum + role.userCount, 0)}
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-background">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">
                      Avg. Permissions
                    </span>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    {Math.round(
                      customRoles.reduce(
                        (sum, role) => sum + role.permissionCount,
                        0
                      ) / customRoles.length
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Roles table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Permissions</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead className="text-center">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customRoles.map(role => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Badge className={role.color}>{role.name}</Badge>
                          </div>
                        </TableCell>

                        <TableCell className="max-w-xs">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {role.description ?? "No description provided"}
                          </p>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {role.permissionCount}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline">{role.userCount}</Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <p className="text-sm text-muted-foreground">
                            {new Date(role.createdAt).toLocaleDateString()}
                          </p>
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRole(role);
                                  setShowEditDialog(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteRole(role.id, role.name)
                                }
                                disabled={role.userCount > 0}
                                className="flex items-center gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Role
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Helpful note */}
              <Alert className="flex flex-row items-center gap-2">
                <div>
                  <Info className="h-4 w-4" />
                </div>
                <AlertDescription>
                  Custom roles cannot be deleted if they are currently assigned
                  to users. Reassign users to different roles before deleting.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-12 flex items-center flex-col">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Custom Roles Yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create custom roles to give your team members exactly the
                permissions they need. Start by clicking the &quot;Create
                Role&quot; button above.
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Your First Custom Role
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Custom Role Dialog */}
      <CreateCustomRoleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={organizationId}
        userId={userId}
      />

      {/* Edit Custom Role Dialog */}
      <EditCustomRoleDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        organizationId={organizationId}
        userId={userId}
        role={selectedRole}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Custom Role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete the role{" "}
              <span className="font-semibold text-foreground">
                &quot;{roleToDelete?.name}&quot;
              </span>
              ? This action cannot be undone and will permanently remove this
              role from your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setRoleToDelete(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRole}
              disabled={deleteRoleMutation.isPending}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
