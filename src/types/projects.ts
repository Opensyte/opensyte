// NOTE: If a type already exists in Prisma, do not redefine it here.
// Always use the Prisma types directly to maintain consistency.

// Project and Task related types
import type { TaskStatus, ProjectStatus, Task, Priority } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

// Re-export Prisma types for easier imports
export type { Task, TaskStatus, ProjectStatus, Priority } from "@prisma/client";

// Extended types for Task with relations (for components that need related data)
export type TaskWithAssignee = Task & {
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    emailVerified?: boolean;
  } | null;
};

export type TaskWithProject = Task & {
  project?: {
    id: string;
    name: string;
    organizationId?: string;
    description?: string | null;
    status?: ProjectStatus;
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    createdById?: string | null;
    currency?: string;
    budget?: Decimal | null;
  } | null;
};

export type TaskWithRelations = Task & {
  assignee?: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    emailVerified?: boolean;
  } | null;
  project?: {
    id: string;
    name: string;
    organizationId?: string;
    description?: string | null;
    status?: ProjectStatus;
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
    createdById?: string | null;
    currency?: string;
    budget?: Decimal | null;
  } | null;
};

// TaskPriority is now Priority from Prisma - no need to redefine

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  projectId?: string;
  dateRange?: [Date, Date] | null;
  searchQuery?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  dateRange?: [Date, Date] | null;
  searchQuery?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  completionRate: number;
}

// Status and Priority Color Mappings
export const taskStatusColors = {
  BACKLOG: "bg-gray-100 text-gray-800",
  TODO: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  REVIEW: "bg-purple-100 text-purple-800",
  DONE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
} as const;

export const taskStatusLabels = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
  ARCHIVED: "Archived",
} as const;

export const taskPriorityColors = {
  LOW: "text-green-600",
  MEDIUM: "text-yellow-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600",
} as const;

export const taskPriorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export const taskPriorityBackgroundColors = {
  LOW: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
} as const;

export const taskPriorityIcons = {
  LOW: "🔽",
  MEDIUM: "➖",
  HIGH: "🔼",
  URGENT: "🚨",
} as const;

export const projectStatusColors = {
  PLANNING: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  ON_HOLD: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
} as const;

export const projectStatusLabels = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

// Kanban Board Configuration
export const KANBAN_COLUMNS = [
  { id: "BACKLOG" as const, name: "Backlog" },
  { id: "TODO" as const, name: "To Do" },
  { id: "IN_PROGRESS" as const, name: "In Progress" },
  { id: "REVIEW" as const, name: "Review" },
  { id: "DONE" as const, name: "Done" },
  { id: "ARCHIVED" as const, name: "Archived" },
] as const;

export type KanbanColumnType = typeof KANBAN_COLUMNS[number];

// Transform Task to match KanbanItemProps with proper typing
export type KanbanTask = TaskWithRelations & {
  column: string;
  name: string;
};
