"use client";

import { useState, useMemo } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from "~/components/ui/kibo-ui/kanban";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { CalendarDays, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import {
  taskPriorityColors,
  taskPriorityLabels,
  taskStatusColors,
  KANBAN_COLUMNS,
  type TaskWithRelations,
  type KanbanTask,
} from "~/types/projects";
import type { TaskStatus } from "@prisma/client";

interface ProjectKanbanBoardProps {
  tasks: TaskWithRelations[];
  isLoading: boolean;
  organizationId: string;
  projectId: string;
}

export function ProjectKanbanBoard({
  tasks,
  isLoading,
  organizationId,
  projectId,
}: ProjectKanbanBoardProps) {
  // Local state for optimistic UI updates
  const [localTasks, setLocalTasks] = useState<TaskWithRelations[]>([]);

  const utils = api.useUtils();
  const updateTask = api.task.update.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate({ organizationId, projectId });
      toast.success("Task status updated successfully");
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? "Failed to update task status");
      // Reset local state to server state on error
      setLocalTasks(tasks);
      void utils.task.getAll.invalidate({ organizationId, projectId });
    },
  });

  // Use local tasks if available, otherwise use props tasks
  const currentTasks = localTasks.length > 0 ? localTasks : tasks;

  // Transform tasks to match Kanban format with proper memoization
  const kanbanTasks: KanbanTask[] = useMemo(
    () =>
      currentTasks.map(task => ({
        ...task,
        column: task.status,
        name: task.title,
      })),
    [currentTasks]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const task = kanbanTasks.find(t => t.id === taskId);

    if (!task) return;

    // Determine new status - could be dropped on a column or another task
    let newStatus: TaskStatus;
    const overTask = kanbanTasks.find(t => t.id === over.id);

    if (overTask) {
      // Dropped on another task - use that task's status
      newStatus = overTask.status;
    } else {
      // Dropped on a column
      const columnId = over.id as string;
      const isValidColumn = KANBAN_COLUMNS.some(col => col.id === columnId);

      if (!isValidColumn) return;

      newStatus = columnId as TaskStatus;
    }

    // Only update if status actually changed
    if (task.status === newStatus) return;

    // OPTIMISTIC UI UPDATE: Update local state immediately for instant feedback
    const updatedTasks = currentTasks.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    );
    setLocalTasks(updatedTasks);

    // Then call tRPC mutation to sync with server
    updateTask.mutate({
      id: taskId,
      organizationId,
      status: newStatus,
    });
  };

  const handleDataChange = (_newData: KanbanTask[]) => {
    // This is handled by onDragEnd, but we need this prop for the KanbanProvider
    // The actual data updates are managed by tRPC queries
  };

  const getTasksByStatus = (status: string) => {
    return kanbanTasks.filter(task => task.status === status);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground">No tasks yet</h3>
          <p className="text-muted-foreground mt-2">
            Create your first task to see it on the board.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <KanbanProvider
        columns={KANBAN_COLUMNS as unknown as { id: string; name: string }[]}
        data={kanbanTasks}
        onDataChange={handleDataChange}
        onDragEnd={handleDragEnd}
        className="hide-scrollbar flex h-auto min-h-[calc(100vh-350px)] gap-4 overflow-x-auto pb-4"
      >
        {column => (
          <KanbanBoard
            key={column.id}
            id={column.id}
            className="w-72 flex-none rounded-lg border border-border bg-card shadow-sm"
          >
            {/* Column Header */}
            <KanbanHeader className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${taskStatusColors[column.id as TaskStatus]}`}
                  />
                  <h3 className="font-semibold text-sm text-foreground">
                    {column.name}
                  </h3>
                </div>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 rounded-full bg-muted-foreground/10 px-2 text-xs font-medium"
                >
                  {getTasksByStatus(column.id).length}
                </Badge>
              </div>
            </KanbanHeader>

            {/* Column Cards */}
            <KanbanCards id={column.id}>
              {(task: KanbanTask) => (
                <KanbanCard
                  key={task.id}
                  id={task.id}
                  name={task.name}
                  column={task.column}
                  className="bg-card hover:shadow-md transition-shadow duration-200"
                >
                  <Card className="w-full border-none shadow-none cursor-pointer hover:bg-muted/30 transition-colors duration-200">
                    <CardContent className="p-3 space-y-2.5">
                      {/* Task Header with Priority */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-foreground line-clamp-2 flex-1">
                          {task.title}
                        </h4>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 text-xs font-medium ${taskPriorityColors[task.priority]} bg-transparent border`}
                        >
                          {taskPriorityLabels[task.priority]}
                        </Badge>
                      </div>

                      {/* Task Metadata Row */}
                      {(task.dueDate ?? task.estimatedHours) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.dueDate && (
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span className="font-medium">
                                {format(task.dueDate, "MMM dd")}
                              </span>
                            </div>
                          )}

                          {task.estimatedHours && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">
                                {task.estimatedHours}h
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Task Footer */}
                      <div className="flex items-center justify-between pt-1">
                        {/* Assignee Info */}
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={task.assignee.image ?? undefined}
                                alt={task.assignee.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xs font-semibold">
                                {task.assignee.name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-muted-foreground truncate max-w-20">
                              {task.assignee.name.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground/60">
                            <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/10">
                              <User className="h-3.5 w-3.5 text-muted-foreground/40" />
                            </div>
                            <span className="text-xs">Unassigned</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </KanbanCard>
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
    </div>
  );
}
