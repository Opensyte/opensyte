"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  GitBranch,
  MoreVertical,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import type { RouterOutputs } from "~/trpc/react";

type WorkflowType =
  RouterOutputs["workflows"]["workflow"]["getWorkflows"]["workflows"][0];

interface WorkflowListPageProps {
  organizationId: string;
}

export function WorkflowListPage({ organizationId }: WorkflowListPageProps) {
  const router = useRouter();
  const utils = api.useUtils();

  // tRPC queries and mutations
  const {
    data: workflowsData,
    isLoading: isLoadingWorkflows,
    error: workflowsError,
  } = api.workflows.workflow.getWorkflows.useQuery(
    {
      organizationId,
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!organizationId,
    }
  );

  const createWorkflowMutation =
    api.workflows.workflow.createWorkflow.useMutation({
      onSuccess: data => {
        toast.success("Workflow created successfully");
        // Navigate to the workflow designer
        router.push(`/${organizationId}/workflows/${data.id}`);
        setIsCreateDialogOpen(false);
        setNewWorkflow({ name: "", description: "", category: "" });
        void utils.workflows.workflow.getWorkflows.invalidate();
      },
      onError: err => {
        toast.error("Failed to create workflow", {
          description: err.message,
        });
      },
    });

  const updateWorkflowMutation =
    api.workflows.workflow.updateWorkflow.useMutation({
      onSuccess: () => {
        toast.success("Workflow updated successfully");
        void utils.workflows.workflow.getWorkflows.invalidate();
      },
      onError: err => {
        toast.error("Failed to update workflow", {
          description: err.message,
        });
      },
    });

  const deleteWorkflowMutation =
    api.workflows.workflow.deleteWorkflow.useMutation({
      onSuccess: () => {
        toast.success("Workflow deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedWorkflow(null);
        void utils.workflows.workflow.getWorkflows.invalidate();
      },
      onError: err => {
        toast.error("Failed to delete workflow", {
          description: err.message,
        });
      },
    });

  // Component state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | null>(
    null
  );
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    category: "",
  });
  const [editWorkflow, setEditWorkflow] = useState({
    name: "",
    description: "",
    category: "",
  });

  const workflows = workflowsData?.workflows ?? [];

  const handleCreateWorkflow = () => {
    if (!newWorkflow.name.trim()) return;

    createWorkflowMutation.mutate({
      organizationId,
      name: newWorkflow.name,
      description: newWorkflow.description || undefined,
      category: newWorkflow.category || undefined,
    });
  };

  const handleEditWorkflow = (workflow: WorkflowType) => {
    setSelectedWorkflow(workflow);
    setEditWorkflow({
      name: workflow.name,
      description: workflow.description ?? "",
      category: workflow.category ?? "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWorkflow = () => {
    if (!selectedWorkflow || !editWorkflow.name.trim()) return;

    updateWorkflowMutation.mutate({
      id: selectedWorkflow.id,
      organizationId,
      name: editWorkflow.name,
      description: editWorkflow.description || undefined,
      category: editWorkflow.category || undefined,
    });

    setIsEditDialogOpen(false);
    setSelectedWorkflow(null);
    setEditWorkflow({ name: "", description: "", category: "" });
  };

  const handleDeleteWorkflow = (workflow: WorkflowType) => {
    setSelectedWorkflow(workflow);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (!selectedWorkflow) return;

    deleteWorkflowMutation.mutate({
      id: selectedWorkflow.id,
      organizationId,
    });
  };

  const toggleWorkflowStatus = (workflowId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    updateWorkflowMutation.mutate({
      id: workflowId,
      organizationId,
      status: newStatus,
    });
  };

  // Loading state
  if (isLoadingWorkflows) {
    return <WorkflowListSkeleton />;
  }

  // Error state
  if (workflowsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <div className="text-destructive mb-4">
              <AlertTriangle className="h-8 w-8 mx-auto" />
            </div>
            <CardTitle className="mb-2">Failed to load workflows</CardTitle>
            <CardDescription className="mb-4">
              {workflowsError.message}
            </CardDescription>
            <Button
              onClick={() => utils.workflows.workflow.getWorkflows.invalidate()}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.WORKFLOWS_READ,
        PERMISSIONS.WORKFLOWS_WRITE,
        PERMISSIONS.WORKFLOWS_ADMIN,
      ]}
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="p-8 text-center max-w-md">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                <GitBranch className="h-8 w-8 mx-auto" />
              </div>
              <CardTitle className="mb-2">Access Denied</CardTitle>
              <CardDescription>
                You don&apos;t have permission to view workflows.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
            <p className="text-muted-foreground">
              Manage and create automated workflows for your organization
            </p>
          </div>
          <ClientPermissionGuard
            requiredAnyPermissions={[
              PERMISSIONS.WORKFLOWS_WRITE,
              PERMISSIONS.WORKFLOWS_ADMIN,
            ]}
            fallback={null}
          >
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Create a new automated workflow to streamline your
                    processes.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflow-name">Workflow Name *</Label>
                    <Input
                      id="workflow-name"
                      placeholder="Enter workflow name"
                      value={newWorkflow.name}
                      onChange={e =>
                        setNewWorkflow({ ...newWorkflow, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflow-description">Description</Label>
                    <Textarea
                      id="workflow-description"
                      placeholder="Describe what this workflow does"
                      value={newWorkflow.description}
                      onChange={e =>
                        setNewWorkflow({
                          ...newWorkflow,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workflow-category">Category</Label>
                    <Select
                      value={newWorkflow.category}
                      onValueChange={value =>
                        setNewWorkflow({ ...newWorkflow, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRM">CRM</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Projects">Projects</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Customer Service">
                          Customer Service
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWorkflow}
                    disabled={
                      !newWorkflow.name.trim() ||
                      createWorkflowMutation.isPending
                    }
                    className="w-full sm:w-auto"
                  >
                    {createWorkflowMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create & Design"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </ClientPermissionGuard>
        </div>

        {/* Edit Workflow Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Workflow</DialogTitle>
              <DialogDescription>
                Update the details of your workflow.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-workflow-name">Workflow Name *</Label>
                <Input
                  id="edit-workflow-name"
                  placeholder="Enter workflow name"
                  value={editWorkflow.name}
                  onChange={e =>
                    setEditWorkflow({ ...editWorkflow, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-workflow-description">Description</Label>
                <Textarea
                  id="edit-workflow-description"
                  placeholder="Describe what this workflow does"
                  value={editWorkflow.description}
                  onChange={e =>
                    setEditWorkflow({
                      ...editWorkflow,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-workflow-category">Category</Label>
                <Select
                  value={editWorkflow.category}
                  onValueChange={value =>
                    setEditWorkflow({ ...editWorkflow, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRM">CRM</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Projects">Projects</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Customer Service">
                      Customer Service
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateWorkflow}
                disabled={
                  !editWorkflow.name.trim() || updateWorkflowMutation.isPending
                }
                className="w-full sm:w-auto"
              >
                {updateWorkflowMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Workflow Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{selectedWorkflow?.name}
                &rdquo;? This action cannot be undone and will permanently
                remove the workflow and all its configurations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteWorkflow}
                disabled={deleteWorkflowMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteWorkflowMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Workflow"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map(workflow => (
            <Card
              key={workflow.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {workflow.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          workflow.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {workflow.status === "ACTIVE" ? (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : workflow.status === "DRAFT" ? (
                          <>
                            <Edit className="h-3 w-3 mr-1" />
                            Draft
                          </>
                        ) : (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            {workflow.status.charAt(0) +
                              workflow.status.slice(1).toLowerCase()}
                          </>
                        )}
                      </Badge>
                      {workflow.category && (
                        <Badge variant="outline" className="text-xs">
                          {workflow.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 line-clamp-2">
                  {workflow.description ?? "No description provided"}
                </CardDescription>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>{workflow.totalExecutions} executions</span>
                  <span>
                    Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/${organizationId}/workflows/${workflow.id}`}
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                    >
                      <GitBranch className="h-4 w-4" />
                      Design
                    </Button>
                  </Link>
                  <ClientPermissionGuard
                    requiredAnyPermissions={[
                      PERMISSIONS.WORKFLOWS_WRITE,
                      PERMISSIONS.WORKFLOWS_ADMIN,
                    ]}
                    fallback={null}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleWorkflowStatus(workflow.id, workflow.status)
                      }
                      disabled={updateWorkflowMutation.isPending}
                    >
                      {updateWorkflowMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : workflow.status === "ACTIVE" ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </ClientPermissionGuard>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ClientPermissionGuard
                        requiredAnyPermissions={[
                          PERMISSIONS.WORKFLOWS_WRITE,
                          PERMISSIONS.WORKFLOWS_ADMIN,
                        ]}
                        fallback={null}
                      >
                        <DropdownMenuItem
                          onClick={() => handleEditWorkflow(workflow)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                      </ClientPermissionGuard>
                      <ClientPermissionGuard
                        requiredPermissions={[PERMISSIONS.WORKFLOWS_ADMIN]}
                        fallback={null}
                      >
                        <DropdownMenuItem
                          onClick={() => handleDeleteWorkflow(workflow)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </ClientPermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {workflows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center mb-6">
              <GitBranch className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              No workflows yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
              Get started by creating your first automated workflow to
              streamline your business processes
            </p>
            <ClientPermissionGuard
              requiredAnyPermissions={[
                PERMISSIONS.WORKFLOWS_WRITE,
                PERMISSIONS.WORKFLOWS_ADMIN,
              ]}
              fallback={
                <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-dashed">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">Permission Required</span>
                  </div>
                  You need workflow write permissions to create workflows.
                </div>
              }
            >
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Your First Workflow
              </Button>
            </ClientPermissionGuard>
          </div>
        )}
      </div>
    </ClientPermissionGuard>
  );
}

// Loading skeleton component
function WorkflowListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
