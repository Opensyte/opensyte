"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ProjectEditDialog } from "./project-edit-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { projectStatusColors, projectStatusLabels } from "~/types/projects";
import { formatDistanceToNow } from "date-fns";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    budget: number | null;
    currency: string | null;
    createdAt: Date;
    _count: {
      tasks: number;
    };
  };
  organizationId: string;
  viewMode: "grid" | "list";
}

export function ProjectCard({
  project,
  organizationId,
  viewMode,
}: ProjectCardProps) {
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  const utils = api.useUtils();

  const deleteProjectMutation = api.project.delete.useMutation({
    onSuccess: () => {
      void utils.project.getAll.invalidate();
      void utils.project.getStats.invalidate();
      toast.success("Project deleted successfully!");
    },
    onError: error => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      await deleteProjectMutation.mutateAsync({
        id: project.id,
        organizationId,
      });
    }
  };

  // Calculate progress (mock calculation based on status)
  const getProgress = () => {
    switch (project.status) {
      case "PLANNED":
        return 10;
      case "IN_PROGRESS":
        return 45;
      case "ON_HOLD":
        return 30;
      case "COMPLETED":
        return 100;
      case "CANCELLED":
        return 0;
      default:
        return 0;
    }
  };

  const progress = getProgress();

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href={`/${organizationId}/projects/${project.id}`}
                  className="font-semibold text-lg hover:text-primary transition-colors truncate"
                >
                  {project.name}
                </Link>
                <Badge
                  variant="secondary"
                  className={
                    projectStatusColors[
                      project.status as keyof typeof projectStatusColors
                    ]
                  }
                >
                  {
                    projectStatusLabels[
                      project.status as keyof typeof projectStatusLabels
                    ]
                  }
                </Badge>
              </div>

              {project.description && (
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{project._count.tasks} tasks</span>
                </div>

                {project.startDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Started{" "}
                      {formatDistanceToNow(project.startDate, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}

                {project.budget && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {project.currency ?? "USD"}{" "}
                      {project.budget.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="text-right min-w-0">
                <div className="text-sm font-medium mb-1">
                  {progress}% Complete
                </div>
                <Progress value={progress} className="w-24" />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                    disabled={deleteProjectMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>

        <ProjectEditDialog
          project={project}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          organizationId={organizationId}
        />
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg mb-2">
              <Link
                href={`/${organizationId}/projects/${project.id}`}
                className="hover:text-primary transition-colors line-clamp-1"
              >
                {project.name}
              </Link>
            </CardTitle>
            <Badge
              variant="secondary"
              className={
                projectStatusColors[
                  project.status as keyof typeof projectStatusColors
                ]
              }
            >
              {
                projectStatusLabels[
                  project.status as keyof typeof projectStatusLabels
                ]
              }
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
                disabled={deleteProjectMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {project.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {project._count.tasks} tasks
            </span>
          </div>

          {project.startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(project.startDate, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {project.budget && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="font-medium">
                {project.currency ?? "USD"} {project.budget.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <Button asChild className="w-full">
          <Link href={`/${organizationId}/projects/${project.id}`}>
            View Project
          </Link>
        </Button>
      </CardContent>

      <ProjectEditDialog
        project={project}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        organizationId={organizationId}
      />
    </Card>
  );
}
