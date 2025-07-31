"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  LayoutList,
  KanbanSquare,
  GanttChartSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
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
import { ProjectTasksSkeleton } from "./project-tasks-skeleton";
import { ProjectGanttBoard } from "./project-gantt-board";
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

export function ProjectTasksClient({
  organizationId,
  projectId,
}: ProjectTasksClientProps) {
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: project, isLoading: isLoadingProject } =
    api.project.getById.useQuery({
      id: projectId,
      organizationId,
    });

  const { data: tasks, isLoading: isLoadingTasks } = api.task.getAll.useQuery({
    organizationId,
    projectId,
  });

  const filteredTasks =
    tasks?.filter((task) => {
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesSearch =
        searchQuery === "" ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    }) ?? [];

  const utils = api.useUtils();

  const deleteProject = api.project.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      void utils.project.getAll.invalidate();
      router.push(`/${organizationId}/projects`);
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

  if (isLoadingProject) {
    return <ProjectTasksSkeleton />;
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <p className="text-muted-foreground mt-2">
            The project you are looking for does not exist or you do not have
            permission to view it.
          </p>
          <Button
            onClick={() => router.push(`/${organizationId}/projects`)}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {project.description ??
                "Manage tasks, board, and timeline for this project."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsCreateTaskDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsEditProjectDialogOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
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

      <Tabs defaultValue="list" className="flex flex-col overflow-hidden p-0">
        <div className="border-b px-4 md:px-6">
          <TabsList>
            <TabsTrigger value="list">
              <LayoutList className="mr-2 h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="board">
              <KanbanSquare className="mr-2 h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="gantt">
              <GanttChartSquare className="mr-2 h-4 w-4" />
              Gantt
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="list"
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="bg-muted/30 border-b p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="BACKLOG">Backlog</SelectItem>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="REVIEW">Review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 pl-9"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TasksList
              tasks={filteredTasks}
              isLoading={isLoadingTasks}
              organizationId={organizationId}
              projectId={projectId}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="board"
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium">Board View</h3>
              <p className="text-muted-foreground mt-2">
                This feature is coming soon.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="gantt"
          className="flex-1 h-full min-h-0 p-4"
        >
          <div className="flex h-full min-h-0 flex-col">
            <ProjectGanttBoard 
              organizationId={organizationId}
              projectId={projectId}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskCreateDialog
        open={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
        organizationId={organizationId}
        projectId={projectId}
      />

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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{project?.name}&rdquo;?
              This action cannot be undone. All tasks and data associated with
              this project will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600 sm:w-auto"
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
