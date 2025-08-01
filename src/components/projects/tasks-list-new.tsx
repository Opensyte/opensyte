"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  MoreHorizontal,
  Calendar,
  Trash2,
  Edit,
  GripVertical,
  User2,
  Loader2,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { TaskEditDialog } from "./task-edit-dialog";
import { TaskViewDialog } from "./task-view-dialog";
import type { Task, TaskStatus } from "~/types";
import {
  taskStatusColors,
  taskStatusLabels,
  taskPriorityColors,
  taskPriorityIcons,
} from "~/types";

interface TasksListProps {
  tasks: Task[];
  isLoading: boolean;
  organizationId: string;
  projectId: string;
}

// Sortable Task Row Component
function SortableTaskRow({
  task,
  handleCheckboxChange,
  handleStatusChange,
  handleDelete,
  setEditingTask,
  setViewingTask,
}: {
  task: Task;
  handleCheckboxChange: (taskId: string, checked: boolean) => void;
  handleStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  handleDelete: (task: Task) => void;
  setEditingTask: (task: Task | null) => void;
  setViewingTask: (task: Task | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/50 group ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* Checkbox and Drag Handle */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={task.status === "DONE"}
            onCheckedChange={checked =>
              handleCheckboxChange(task.id, checked as boolean)
            }
          />
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </TableCell>

      {/* Priority */}
      <TableCell>
        <span
          className={`text-lg ${taskPriorityColors[task.priority as keyof typeof taskPriorityColors]}`}
          title={task.priority}
        >
          {taskPriorityIcons[task.priority as keyof typeof taskPriorityIcons]}
        </span>
      </TableCell>

      {/* Task Name */}
      <TableCell>
        <div className="space-y-1">
          <button
            onClick={() => setViewingTask(task)}
            className={`cursor-pointer text-left font-medium hover:underline ${task.status === "DONE" ? "text-muted-foreground line-through" : ""}`}
          >
            {task.title.length > 50
              ? `${task.title.substring(0, 50)}...`
              : task.title}
          </button>
          {task.description && (
            <div className="text-muted-foreground line-clamp-1 text-sm">
              {task.description}
            </div>
          )}
        </div>
      </TableCell>

      {/* Assignee with user image and name */}
      <TableCell>
        {task.assignee ? (
          <div className="flex items-center gap-2">
            {task.assignee.image ? (
              <div className="h-6 w-6 overflow-hidden rounded-full">
                <Image
                  src={task.assignee.image}
                  alt={task.assignee.name ?? "User"}
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="bg-primary/20 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                {(
                  task.assignee.name?.slice(0, 1) ??
                  task.assignee.email?.slice(0, 1) ??
                  "U"
                ).toUpperCase()}
              </div>
            )}
            <span className="truncate text-sm">
              {task.assignee.name ?? task.assignee.email ?? "Unknown User"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground flex items-center gap-2 text-sm">
            <User2 className="h-4 w-4" />
            Unassigned
          </span>
        )}
      </TableCell>

      {/* Due Date */}
      <TableCell>
        {task.dueDate ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No due date</span>
        )}
      </TableCell>

      {/* Priority Badge */}
      <TableCell>
        <Badge
          variant="outline"
          className={`${taskPriorityColors[task.priority as keyof typeof taskPriorityColors]} border-current`}
        >
          <span className="mr-1">
            {taskPriorityIcons[task.priority as keyof typeof taskPriorityIcons]}
          </span>
          {task.priority.charAt(0).toUpperCase() +
            task.priority.slice(1).toLowerCase()}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Select
          value={task.status}
          onValueChange={value =>
            handleStatusChange(task.id, value as TaskStatus)
          }
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue asChild>
              <Badge
                className={
                  taskStatusColors[task.status as keyof typeof taskStatusColors]
                }
              >
                {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BACKLOG">Backlog</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="REVIEW">Review</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingTask(task)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(task)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function TasksList({
  tasks,
  isLoading,
  organizationId,
  projectId,
}: TasksListProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const utils = api.useUtils();

  // Update local tasks when props change
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Fetch organization members for assignee data
  const { data: members } = api.organization.getMembers.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update local tasks when tasks prop changes and enrich with assignee data
  useEffect(() => {
    if (tasks && members) {
      const enrichedTasks = tasks.map(task => ({
        ...task,
        assignee: task.assignedToId
          ? (members.find(member => member.userId === task.assignedToId)
              ?.user ?? null)
          : null,
      }));
      setLocalTasks(enrichedTasks);
    } else {
      setLocalTasks(tasks);
    }
  }, [tasks, members]);

  const updateTaskStatus = api.task.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      void utils.task.getAll.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update task");
    },
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted successfully");
      void utils.task.getAll.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to delete task");
    },
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setLocalTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    // Then sync with API
    updateTaskStatus.mutate({
      id: taskId,
      organizationId,
      status: newStatus,
    });
  };

  const handleCheckboxChange = (taskId: string, checked: boolean) => {
    handleStatusChange(taskId, checked ? "DONE" : "TODO");
  };

  const handleDelete = (task: Task) => {
    if (
      confirm(
        `Are you sure you want to delete "${task.title}"? This action cannot be undone.`
      )
    ) {
      deleteTask.mutate({
        id: task.id,
        organizationId,
      });
    }
  };

  // Note: Task reordering is not implemented yet (requires schema changes)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeTask = localTasks.find(task => task.id === String(active.id));
      const overTask = localTasks.find(task => task.id === String(over.id));

      if (activeTask && overTask) {
        // For now, just show the edit dialog since reordering requires schema changes
        setEditingTask(activeTask);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (localTasks.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No tasks found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-20"></TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead className="w-32">Assignee</TableHead>
              <TableHead className="w-32">Due date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <SortableContext
            items={localTasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <TableBody>
              {localTasks.map(task => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  handleCheckboxChange={handleCheckboxChange}
                  handleStatusChange={handleStatusChange}
                  handleDelete={handleDelete}
                  setEditingTask={setEditingTask}
                  setViewingTask={setViewingTask}
                />
              ))}
            </TableBody>
          </SortableContext>
        </Table>
      </DndContext>

      {/* Edit Dialog */}
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={open => !open && setEditingTask(null)}
          organizationId={organizationId}
          projectId={projectId}
        />
      )}

      {/* View Dialog */}
      {viewingTask && (
        <TaskViewDialog
          task={viewingTask}
          open={!!viewingTask}
          onOpenChange={open => !open && setViewingTask(null)}
        />
      )}
    </>
  );
}
