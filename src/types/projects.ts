// Project and Task related types

export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE"
  | "ARCHIVED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null;
  dueDate: Date | null;
  assignedToId: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  organizationId: string;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  project?: {
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
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
