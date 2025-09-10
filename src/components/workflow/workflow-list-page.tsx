"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  GitBranch,
  MoreVertical,
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
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { WorkflowDesigner } from "./workflow-designer";

// Dummy data for development
const workflows = [
  {
    id: 1,
    name: "Welcome Workflow",
    description: "Send welcome communications upon new signup",
    triggerConfig: { type: "form_submitted", formId: "signupForm" },
    status: "ACTIVE",
    organizationId: 1,
    nodeCount: 3,
    lastModified: "2025-09-10",
  },
  {
    id: 2,
    name: "Deal Closure Workflow",
    description: "Trigger actions when a deal is marked closed",
    triggerConfig: {
      type: "record_updated",
      entity: "deals",
      criteria: { stage: "closed_won" },
    },
    status: "INACTIVE",
    organizationId: 1,
    nodeCount: 5,
    lastModified: "2025-09-09",
  },
  {
    id: 3,
    name: "Employee Onboarding",
    description: "Automated onboarding process for new employees",
    triggerConfig: { type: "record_created", entity: "employees" },
    status: "ACTIVE",
    organizationId: 1,
    nodeCount: 8,
    lastModified: "2025-09-08",
  },
];

interface WorkflowListPageProps {
  organizationId: string;
}

export function WorkflowListPage({ organizationId }: WorkflowListPageProps) {
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<
    (typeof workflows)[0] | null
  >(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
  });
  const [editWorkflow, setEditWorkflow] = useState({
    name: "",
    description: "",
  });

  const handleCreateWorkflow = () => {
    // Here you would typically make an API call to create the workflow
    console.log("Creating workflow:", newWorkflow);
    setIsCreateDialogOpen(false);
    setNewWorkflow({ name: "", description: "" });
    // For now, navigate to designer with new workflow
    window.location.href = `/${organizationId}/workflows/new`;
  };

  const handleEditWorkflow = (workflow: (typeof workflows)[0]) => {
    setSelectedWorkflow(workflow);
    setEditWorkflow({
      name: workflow.name,
      description: workflow.description,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWorkflow = () => {
    if (selectedWorkflow) {
      // Here you would typically make an API call to update the workflow
      console.log("Updating workflow:", selectedWorkflow.id, editWorkflow);
      setIsEditDialogOpen(false);
      setSelectedWorkflow(null);
      setEditWorkflow({ name: "", description: "" });
    }
  };

  const handleDeleteWorkflow = (workflow: (typeof workflows)[0]) => {
    setSelectedWorkflow(workflow);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteWorkflow = () => {
    if (selectedWorkflow) {
      console.log("Deleting workflow:", selectedWorkflow.id);
      setIsDeleteDialogOpen(false);
      setSelectedWorkflow(null);
    }
  };

  const toggleWorkflowStatus = (workflowId: number) => {
    // Here you would typically make an API call to toggle the workflow status
    console.log("Toggling workflow status for workflow:", workflowId);
  };

  if (isDesignerOpen) {
    return (
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Workflow Designer
            </h2>
            <p className="text-muted-foreground">
              Design and configure your automated workflows
            </p>
          </div>
          <Button variant="outline" onClick={() => setIsDesignerOpen(false)}>
            Back to Workflows
          </Button>
        </div>
        <WorkflowDesigner organizationId={organizationId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
          <p className="text-muted-foreground">
            Manage and create automated workflows for your organization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Create a new automated workflow to streamline your processes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
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
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkflow}
                disabled={!newWorkflow.name.trim()}
              >
                Create & Design
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Workflow Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update the details of your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-workflow-name">Workflow Name</Label>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWorkflow}
              disabled={!editWorkflow.name.trim()}
            >
              Save Changes
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
              &rdquo;? This action cannot be undone and will permanently remove
              the workflow and all its configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteWorkflow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workflow
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
                <div>
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <Badge
                    variant={
                      workflow.status === "ACTIVE" ? "default" : "secondary"
                    }
                    className="mt-1"
                  >
                    {workflow.status === "ACTIVE" ? (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 line-clamp-2">
                {workflow.description}
              </CardDescription>

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{workflow.nodeCount} nodes</span>
                <span>Modified {workflow.lastModified}</span>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/${organizationId}/workflows/${workflow.id}`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <GitBranch className="h-4 w-4" />
                    Design
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleWorkflowStatus(workflow.id)}
                >
                  {workflow.status === "ACTIVE" ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleEditWorkflow(workflow)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteWorkflow(workflow)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card className="p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-4">
            <GitBranch className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="mb-2">No workflows yet</CardTitle>
          <CardDescription className="mb-4">
            Get started by creating your first automated workflow
          </CardDescription>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Workflow
          </Button>
        </Card>
      )}
    </div>
  );
}
