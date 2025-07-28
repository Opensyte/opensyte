"use client";

import { useState } from "react";
import { Plus, Search, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TaskCreateDialog } from "./task-create-dialog";
import { TasksList } from "./tasks-list";
import { ProjectEditDialog } from "./project-edit-dialog";
import { Skeleton } from "~/components/ui/skeleton";
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
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface ProjectTasksClientProps {
  organizationId: string;
  projectId: string;
}

export function ProjectTasksClient({ organizationId, projectId }: ProjectTasksClientProps) {
  const [activeTab, setActiveTab] = useState("list");
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();


  // Fetch project details
  const { data: project } = api.project.getById.useQuery({
    id: projectId,
    organizationId,
  });

  // Fetch tasks for this project
  const { data: tasks, isLoading } = api.task.getAll.useQuery({
    organizationId,
    projectId,
  });

  // Filter tasks based on status and search
  const filteredTasks = tasks?.filter(task => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) ?? [];

  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Delete project mutation
  const deleteProject = api.project.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      // Invalidate project list cache to update sidebar
      void utils.project.getAll.invalidate();
      router.push(`/${organizationId}`);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete project");
    },
  });

  const handleDeleteProject = () => {
    if (project) {
      deleteProject.mutate({
        id: project.id,
        organizationId,
      });
    }
  };

  if (!project) {
    return (
      <div className="flex h-full flex-col">
        {/* Header Skeleton */}
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <div className="flex gap-6 h-12 items-center">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-14" />
            </div>
          </div>

          {/* Toolbar Skeleton */}
          <div className="border-b p-4 bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-8 w-64" />
            </div>
          </div>

          {/* Tasks List Skeleton */}
          <div className="flex-1 p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditProjectDialogOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-12 bg-transparent border-0 p-0">
              <TabsTrigger 
                value="list" 
                className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12"
              >
                List
              </TabsTrigger>
              <TabsTrigger 
                value="board" 
                className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12"
              >
                Board
              </TabsTrigger>
              <TabsTrigger 
                value="gantt" 
                className="border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-12"
              >
                Gantt
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === "list" && (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="border-b p-4 bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setIsCreateTaskDialogOpen(true)}
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="BACKLOG">Backlog</SelectItem>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="REVIEW">Review</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>


                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 w-64"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex-1">
                <TasksList
                  tasks={filteredTasks}
                  isLoading={isLoading}
                  organizationId={organizationId}
                  projectId={projectId}
                />
              </div>
            </div>
          )}

          {activeTab === "board" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium">Board View</h3>
                <p className="text-muted-foreground mt-2">
                  Board view will be implemented in a future update
                </p>
              </div>
            </div>
          )}

          {activeTab === "gantt" && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium">Gantt Chart</h3>
                <p className="text-muted-foreground mt-2">
                  Gantt chart will be implemented in a future update
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <TaskCreateDialog
        open={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
        organizationId={organizationId}
        projectId={projectId}
      />

      {/* Edit Project Dialog */}
      {project && (
        <ProjectEditDialog
          open={isEditProjectDialogOpen}
          onOpenChange={setIsEditProjectDialogOpen}
          project={{
            ...project,
            budget: project.budget ? Number(project.budget) : null,
          }}
          organizationId={organizationId}
        />
      )}

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{project?.name}&rdquo;? This action cannot be undone.
              All tasks, files, and data associated with this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
