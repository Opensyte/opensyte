"use client";

import { format } from "date-fns";
import { Calendar, User, Clock, Flag, Tag, FileText } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";

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
}

interface TaskViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  organizationId?: string;
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

const priorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const priorityIcons = {
  LOW: "🔽",
  MEDIUM: "➖",
  HIGH: "🔼",
  URGENT: "🚨",
};

export function TaskViewDialog({ open, onOpenChange, task, organizationId }: TaskViewDialogProps) {
  if (!task) return null;
  
  // Fetch organization members for displaying member names
  const { data: members } = api.organization.getMembers.useQuery(
    { organizationId: organizationId ?? task.organizationId },
    { enabled: !!(organizationId ?? task.organizationId) }
  );
  
  // Find the member name from the ID
  const getAssigneeName = (assignedToId: string) => {
    const member = members?.find(member => member.userId === assignedToId);
    return member?.user?.name ?? assignedToId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-6 break-words w-full">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                {statusLabels[task.status as keyof typeof statusLabels]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <span className={`font-medium ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                {priorityIcons[task.priority as keyof typeof priorityIcons]} {priorityLabels[task.priority as keyof typeof priorityLabels]}
              </span>
            </div>
          </div>

          <Separator />

          {/* Project Information */}
          {task.project && (
            <div className="space-y-2">
              <h3 className="font-medium">Project</h3>
              <p className="text-sm text-muted-foreground">{task.project.name}</p>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Description</h3>
              </div>
              <div className="max-h-32 overflow-y-auto w-full">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words break-all w-full">
                  {task.description}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Assignment and Dates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Assignee */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">Assigned to</h3>
              </div>
              {task.assignedToId ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white">
                    {getAssigneeName(task.assignedToId).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{getAssigneeName(task.assignedToId)}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-3">
              {/* Start Date */}
              {task.startDate && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Start Date</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {format(new Date(task.startDate), "PPP")}
                  </p>
                </div>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Due Date</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {format(new Date(task.dueDate), "PPP")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Time Tracking */}
          {(task.estimatedHours ?? task.actualHours) && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Time Tracking</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-6">
                  {task.estimatedHours && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Estimated</span>
                      <p className="text-sm text-muted-foreground">
                        {task.estimatedHours} hours
                      </p>
                    </div>
                  )}
                  {task.actualHours && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Actual</span>
                      <p className="text-sm text-muted-foreground">
                        {task.actualHours} hours
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Metadata */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Created</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(task.createdAt), "PPP 'at' p")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
