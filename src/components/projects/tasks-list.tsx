"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { MoreHorizontal, Calendar, Trash2, Edit, GripVertical, User2, Loader2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
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

// Define the valid task status values from the schema
type TaskStatusType = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "ARCHIVED";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
  assignedToId: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: Date;
  organizationId: string;
  project: {
    id: string;
    name: string;
  } | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

interface TasksListProps {
  tasks: Task[];
  isLoading: boolean;
  organizationId: string;
  projectId: string;
}

const statusColors = {
  BACKLOG: "bg-gray-100 text-gray-800",
  TODO: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  REVIEW: "bg-purple-100 text-purple-800",
  DONE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
};

const statusLabels = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
  ARCHIVED: "Archived",
};

const priorityColors = {
  LOW: "text-green-600",
  MEDIUM: "text-yellow-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
};

const priorityIcons = {
  LOW: "🔽",
  MEDIUM: "➖",
  HIGH: "🔼",
  URGENT: "🚨",
};

// Sortable Task Row Component
function SortableTaskRow({ 
  task,
  handleCheckboxChange,
  handleStatusChange,
  handleDelete,
  setEditingTask,
  setViewingTask 
}: { 
  task: Task;
  handleCheckboxChange: (taskId: string, checked: boolean) => void;
  handleStatusChange: (taskId: string, newStatus: TaskStatusType) => void;
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
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      className={`hover:bg-muted/50 group ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Checkbox with Drag Handle */}
      <TableCell className="relative">
        <div className="flex items-center gap-2">
          {/* Drag handle - shows on hover */}
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </div>
          <Checkbox 
            checked={task.status === "DONE"}
            onCheckedChange={(checked) => handleCheckboxChange(task.id, checked as boolean)}
          />
        </div>
      </TableCell>

      {/* Priority */}
      <TableCell>
        <div className="flex items-center">
          <span 
            className={`text-lg ${priorityColors[task.priority as keyof typeof priorityColors]}`}
            title={task.priority}
          >
            {priorityIcons[task.priority as keyof typeof priorityIcons]}
          </span>
        </div>
      </TableCell>

      {/* Task Name */}
      <TableCell>
        <div className="space-y-1">
          <button
            onClick={() => setViewingTask(task)}
            className={`font-medium text-left hover:underline cursor-pointer ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title.length > 50 ? `${task.title.substring(0, 50)}...` : task.title}
          </button>
          {task.description && (
            <div className="text-sm text-muted-foreground line-clamp-1">
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
              <div className="h-6 w-6 rounded-full overflow-hidden">
                <Image 
                  src={task.assignee.image} 
                  alt={task.assignee.name ?? "User"} 
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                {(task.assignee.name?.slice(0, 1) ?? task.assignee.email?.slice(0, 1) ?? "U").toUpperCase()}
              </div>
            )}
            <span className="text-sm truncate">{task.assignee.name ?? task.assignee.email ?? "Unknown User"}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm flex items-center gap-2">
            <User2 className="h-4 w-4" />
            Unassigned
          </span>
        )}
      </TableCell>

      {/* Due Date */}
      <TableCell>
        {task.dueDate ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No due date</span>
        )}
      </TableCell>

      {/* Priority Badge */}
      <TableCell>
        <Badge 
          variant="outline" 
          className={`${priorityColors[task.priority as keyof typeof priorityColors]} border-current`}
        >
          <span className="mr-1">{priorityIcons[task.priority as keyof typeof priorityIcons]}</span>
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Select
          value={task.status}
          onValueChange={(value) => handleStatusChange(task.id, value as TaskStatusType)}
        >
          <SelectTrigger className="h-7 w-auto min-w-[100px] border-0 bg-transparent p-1 hover:bg-muted/50 focus:ring-1 focus:ring-ring">
            <SelectValue asChild>
              <Badge className={`text-xs ${statusColors[task.status as keyof typeof statusColors]} border-0`}>
                {statusLabels[task.status as keyof typeof statusLabels]}
              </Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[140px]">
            <SelectItem value="BACKLOG" className="text-xs">
              <Badge className="text-xs bg-gray-100 text-gray-800 border-0">Backlog</Badge>
            </SelectItem>
            <SelectItem value="TODO" className="text-xs">
              <Badge className="text-xs bg-blue-100 text-blue-800 border-0">To Do</Badge>
            </SelectItem>
            <SelectItem value="IN_PROGRESS" className="text-xs">
              <Badge className="text-xs bg-yellow-100 text-yellow-800 border-0">In Progress</Badge>
            </SelectItem>
            <SelectItem value="REVIEW" className="text-xs">
              <Badge className="text-xs bg-purple-100 text-purple-800 border-0">Review</Badge>
            </SelectItem>
            <SelectItem value="DONE" className="text-xs">
              <Badge className="text-xs bg-green-100 text-green-800 border-0">Done</Badge>
            </SelectItem>
            <SelectItem value="ARCHIVED" className="text-xs">
              <Badge className="text-xs bg-gray-100 text-gray-800 border-0">Archived</Badge>
            </SelectItem>
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

export function TasksList({ tasks, isLoading, organizationId, projectId }: TasksListProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const utils = api.useUtils();

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
          ? members.find(member => member.userId === task.assignedToId)?.user ?? null
          : null
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
    onError: (error) => {
      toast.error(error.message ?? "Failed to update task");
    },
  });

  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted successfully");
      void utils.task.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete task");
    },
  });

  const handleStatusChange = (taskId: string, newStatus: TaskStatusType) => {
    // Optimistic update
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus } 
          : task
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
    if (confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      deleteTask.mutate({
        id: task.id,
        organizationId,
      });
    }
  };

  const updateOrderMutation = api.task.updateOrder.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
    onError: (error) => {
      console.error("Failed to update task order:", error);
      toast.error("Failed to reorder tasks");
    },
  });

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = localTasks.findIndex((task) => task.id === String(active.id));
    const overIndex = localTasks.findIndex((task) => task.id === String(over.id));

    if (activeIndex === -1 || overIndex === -1) return;

    // Update local state immediately for optimistic UI
    const newTasks = [...localTasks];
    const [movedTask] = newTasks.splice(activeIndex, 1);
    newTasks.splice(overIndex, 0, movedTask!);
    
    // Update order values
    const tasksWithNewOrder = newTasks.map((task, index) => ({
      ...task,
      order: index,
    }));
    
    setLocalTasks(tasksWithNewOrder);

    // Update in database
    updateOrderMutation.mutate({
      organizationId,
      tasks: tasksWithNewOrder.map((task, index) => ({
        id: task.id,
        order: index,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead className="w-32">Assignee</TableHead>
              <TableHead className="w-32">Due date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <SortableContext items={localTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {localTasks.map((task) => (
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
          onOpenChange={(open) => !open && setEditingTask(null)}
          organizationId={organizationId}
          projectId={projectId}
        />
      )}

      {/* View Dialog */}
      {viewingTask && (
        <TaskViewDialog
          task={viewingTask}
          open={!!viewingTask}
          onOpenChange={(open) => !open && setViewingTask(null)}
          organizationId={organizationId}
        />
      )}
    </>
  );
}
