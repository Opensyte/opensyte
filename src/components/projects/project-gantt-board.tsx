"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Slider } from "~/components/ui/slider";
import { Toggle } from "~/components/ui/toggle";
import { Separator } from "~/components/ui/separator";
import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { addDays, addMonths } from "date-fns";
import {
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttToday,
  GanttAddFeatureHelper,
  type GanttFeature,
  type GanttStatus,
  type Range,
} from "~/components/ui/kibo-ui/gantt";
import {
  taskPriorityBackgroundColors,
  type TaskWithRelations,
} from "~/types/projects";
import TaskViewSheet from "./task-view-sheet";

interface ProjectGanttBoardProps {
  organizationId: string;
  projectId: string;
  tasks: TaskWithRelations[];
  isLoading: boolean;
}

// Task status to Gantt status mapping with Tailwind/Shadcn colors
const getTaskStatusColor = (status: string): GanttStatus => {
  const statusMap: Record<string, GanttStatus> = {
    BACKLOG: {
      id: "backlog",
      name: "Backlog",
      color: "hsl(var(--muted-foreground))",
    },
    TODO: { id: "todo", name: "To Do", color: "hsl(var(--blue-500))" },
    IN_PROGRESS: {
      id: "in_progress",
      name: "In Progress",
      color: "hsl(var(--amber-500))",
    },
    REVIEW: { id: "review", name: "Review", color: "hsl(var(--violet-500))" },
    DONE: { id: "done", name: "Done", color: "hsl(var(--green-500))" },
    ARCHIVED: {
      id: "archived",
      name: "Archived",
      color: "hsl(var(--slate-400))",
    },
  };
  return (
    statusMap[status] ??
    statusMap.BACKLOG ?? {
      id: "backlog",
      name: "Backlog",
      color: "hsl(var(--muted-foreground))",
    }
  );
};

// Priority grouping for sidebar organization
const getPriorityOrder = (priority: string): number => {
  const priorityMap: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  return priorityMap[priority] ?? 3;
};

export function ProjectGanttBoard({
  organizationId,
  projectId,
  tasks,
  isLoading,
}: ProjectGanttBoardProps) {
  const [optimisticTasks, setOptimisticTasks] = useState<
    Array<TaskWithRelations>
  >([]);

  // Add state for popover and new task name
  const [showAddPopover, setShowAddPopover] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [currentMousePosition, setCurrentMousePosition] = useState({
    x: 0,
    y: 0,
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter states - daily is default as requested
  const [zoom, setZoom] = useState(100);
  const [timeRange, setTimeRange] = useState<Range>("monthly");

  // TaskViewSheet state
  const [viewingTask, setViewingTask] = useState<TaskWithRelations | null>(
    null
  );

  const utils = api.useUtils();

  // Fetch organization members for assignee data
  const { data: members } = api.organization.getMembers.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  // Update optimistic tasks when data changes and enrich with assignee data
  useEffect(() => {
    if (tasks && members) {
      const enrichedTasks = tasks.map(task => ({
        ...task,
        assignee: task.assignedToId
          ? (members.find(member => member.userId === task.assignedToId)
              ?.user ?? null)
          : null,
        startDate: task.startDate ?? new Date(),
        dueDate: task.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }));
      setOptimisticTasks(enrichedTasks as TaskWithRelations[]);
    } else {
      setOptimisticTasks(tasks);
    }
  }, [tasks, members]);

  // Track global mouse position for popover placement
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCurrentMousePosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Handle click outside popover to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowAddPopover(false);
        setNewTaskName("");
        setClickedDate(null);
      }
    };

    if (showAddPopover) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAddPopover]);

  // Create task mutation
  const createTaskMutation = api.task.create.useMutation({
    onMutate: async newTask => {
      // Optimistic update - add temporary task with all required Task fields
      const tempTask: TaskWithRelations = {
        id: `temp-${Date.now()}`,
        organizationId,
        projectId,
        parentTaskId: null,
        title: newTask.title,
        description: null,
        status: newTask.status ?? "BACKLOG",
        priority: newTask.priority ?? "MEDIUM",
        startDate: newTask.startDate ?? new Date(),
        dueDate:
          newTask.dueDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: null,
        actualHours: null,
        completedAt: null,
        assignedToId: null,
        order: 0,
        customerInteractionId: null,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: projectId, name: "Current Project" },
        assignee: null,
      };

      setOptimisticTasks(prev => [...prev, tempTask]);
      return { tempTask };
    },
    onSuccess: (createdTask, variables, context) => {
      // Replace temp task with real one
      setOptimisticTasks(prev =>
        prev.map(task =>
          task.id === context?.tempTask.id ? createdTask : task
        )
      );
      toast.success("Task created successfully");
      void utils.task.getAll.invalidate();
    },
    onError: (error, variables, context) => {
      // Remove temp task on error
      if (context?.tempTask) {
        setOptimisticTasks(prev =>
          prev.filter(task => task.id !== context.tempTask.id)
        );
      }
      toast.error(error.message ?? "Failed to create task");
    },
  });

  // Update task dates mutation (for drag/resize)
  const updateTaskMutation = api.task.update.useMutation({
    onSuccess: () => {
      void utils.task.getAll.invalidate();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update task");
      // Revert optimistic update on error
      setOptimisticTasks(tasks ?? []);
    },
  });

  // Convert tasks to Gantt features with date filtering
  const ganttFeatures: GanttFeature[] = useMemo(() => {
    const tasksWithDates = (optimisticTasks ?? []).filter(
      task => task.startDate && task.dueDate
    );

    return tasksWithDates.map(task => ({
      id: task.id,
      name: task.title,
      startAt: new Date(task.startDate!),
      endAt: new Date(task.dueDate!),
      status: getTaskStatusColor(task.status),
      lane: task.priority, // Group by priority
    }));
  }, [optimisticTasks]);

  // Group features by priority for sidebar display
  const groupedFeatures = useMemo(() => {
    const grouped = ganttFeatures.reduce(
      (acc, feature) => {
        const priority = feature.lane ?? "MEDIUM";
        if (!acc[priority]) {
          acc[priority] = [];
        }
        acc[priority].push(feature);
        return acc;
      },
      {} as Record<string, GanttFeature[]>
    );

    // Sort groups by priority order
    const sortedGroups = Object.entries(grouped).sort(
      ([a], [b]) => getPriorityOrder(a) - getPriorityOrder(b)
    );

    return sortedGroups;
  }, [ganttFeatures]);

  // Handle timeline click for task creation (receives Date from Gantt library)
  const handleTimelineClick = useCallback(
    (date: Date) => {
      // Use tracked mouse position or default to center of screen
      const mouseX = currentMousePosition.x ?? window.innerWidth / 2;
      const mouseY = currentMousePosition.y ?? window.innerHeight / 2;

      // Show popover at mouse cursor position
      setPopoverPosition({ x: mouseX, y: mouseY });
      setClickedDate(date);
      setShowAddPopover(true);
    },
    [currentMousePosition]
  );

  // Handle task drag/resize with optimistic updates
  const handleUpdateTaskDates = useCallback(
    (id: string, startAt: Date, endAt: Date | null) => {
      // Optimistic update - update local state immediately
      const updatedTask = optimisticTasks.find(task => task.id === id);
      if (updatedTask) {
        setOptimisticTasks(prev =>
          prev.map(task =>
            task.id === updatedTask.id
              ? {
                  ...task,
                  startDate: startAt,
                  dueDate: endAt,
                  updatedAt: new Date(),
                }
              : task
          )
        );
      }

      // Then sync with backend
      void updateTaskMutation.mutate({
        id,
        organizationId,
        startDate: startAt,
        dueDate: endAt ?? undefined,
      });
    },
    [updateTaskMutation, organizationId, optimisticTasks]
  );

  // Get duration based on selected time range
  const getTaskDurationByRange = useCallback(
    (startDate: Date, range: Range): Date => {
      const endDate = new Date(startDate);

      switch (range) {
        case "daily":
          return addDays(endDate, 1); // 1 day
        case "monthly":
          return addMonths(endDate, 1); // 1 month
        case "quarterly":
          return addMonths(endDate, 3); // 3 months (1 quarter)
        default:
          return addDays(endDate, 1); // fallback to 1 day
      }
    },
    []
  );

  // Handle popover task creation
  const handleAddTaskFromPopover = useCallback(() => {
    if (newTaskName.trim() && clickedDate) {
      const endDate = getTaskDurationByRange(clickedDate, timeRange);

      createTaskMutation.mutate({
        organizationId,
        projectId,
        title: newTaskName.trim(),
        status: "TODO" as const,
        priority: "MEDIUM" as const,
        startDate: clickedDate,
        dueDate: endDate,
      });

      setNewTaskName("");
      setClickedDate(null);
    }
    setShowAddPopover(false);
  }, [
    newTaskName,
    clickedDate,
    createTaskMutation,
    organizationId,
    projectId,
    getTaskDurationByRange,
    timeRange,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
          <span className="text-muted-foreground text-sm">
            Loading Gantt chart...
          </span>
        </div>
      </div>
    );
  }

  if (ganttFeatures.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="mx-auto max-w-md p-6 text-center">
          <div className="mb-4">
            <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              <svg
                className="text-muted-foreground h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-foreground mb-2 text-lg font-medium">
            No Scheduled Tasks
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Tasks need both start and due dates to appear in the Gantt chart.
            Create new tasks or add dates to existing tasks to see them here.
          </p>
          <p className="text-muted-foreground text-xs">
            Tip: Click anywhere on the timeline area to quickly create a new
            task
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Gantt Filters */}
      <div className="flex flex-col gap-4 border-border p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Time Range Filter */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
              View:
            </Label>
            <div className="flex gap-1">
              <Toggle
                pressed={timeRange === "daily"}
                onPressedChange={() => setTimeRange("daily")}
                size="sm"
                className="text-xs px-3 py-1"
              >
                Daily
              </Toggle>
              <Toggle
                pressed={timeRange === "monthly"}
                onPressedChange={() => setTimeRange("monthly")}
                size="sm"
                className="text-xs px-3 py-1"
              >
                Monthly
              </Toggle>
              <Toggle
                pressed={timeRange === "quarterly"}
                onPressedChange={() => setTimeRange("quarterly")}
                size="sm"
                className="text-xs px-3 py-1"
              >
                Quarterly
              </Toggle>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Zoom Control */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium text-muted-foreground">
              Zoom:
            </Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
                className="h-8 w-8 p-0"
              >
                <ZoomOutIcon className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Slider
                  value={[zoom]}
                  onValueChange={value => setZoom(value[0] ?? 100)}
                  max={300}
                  min={25}
                  step={25}
                  className="w-24"
                />
                <span className="text-sm font-medium text-muted-foreground w-10">
                  {zoom}%
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
                className="h-8 w-8 p-0"
              >
                <ZoomInIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <GanttProvider
          className="border-border rounded-lg border h-full min-h-svh"
          onAddItem={handleTimelineClick}
          features={ganttFeatures}
          range={timeRange}
          zoom={zoom}
        >
          <GanttSidebar>
            {groupedFeatures.map(([priority, features]) => (
              <GanttSidebarGroup key={priority} name={`${priority} Priority`}>
                {features.map(feature => (
                  <GanttSidebarItem key={feature.id} feature={feature} />
                ))}
              </GanttSidebarGroup>
            ))}
          </GanttSidebar>

          <GanttTimeline>
            <GanttHeader />

            <GanttFeatureList>
              {groupedFeatures.map(([priority, features]) => (
                <GanttFeatureListGroup key={priority}>
                  <GanttFeatureRow
                    features={features}
                    onMove={handleUpdateTaskDates}
                  >
                    {feature => {
                      // Get task details from optimistic tasks
                      const taskDetails = optimisticTasks.find(
                        t => t.id === feature.id
                      );
                      const priority = taskDetails?.priority ?? "MEDIUM";

                      return (
                        <div
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-white shadow-sm transition-all hover:shadow-md"
                          style={{ backgroundColor: feature.status.color }}
                        >
                          {/* Priority indicator dot */}
                          <div
                            className={`h-2 w-2 rounded-full flex-shrink-0 ${taskPriorityBackgroundColors[priority as keyof typeof taskPriorityBackgroundColors] ?? taskPriorityBackgroundColors.MEDIUM}`}
                          />

                          {/* Task name */}
                          <button
                            className="flex-1 truncate text-sm font-medium text-left hover:underline focus:outline-none focus:underline"
                            onClick={e => {
                              e.stopPropagation();
                              const fullTask = optimisticTasks?.find(
                                t => t.id === feature.id
                              );
                              if (fullTask) {
                                setViewingTask(fullTask);
                              }
                            }}
                          >
                            {feature.name}
                          </button>
                        </div>
                      );
                    }}
                  </GanttFeatureRow>
                </GanttFeatureListGroup>
              ))}
            </GanttFeatureList>

            <GanttToday />

            <GanttAddFeatureHelper top={0} />

            {/* Task creation popover */}
            {showAddPopover && (
              <div
                className="fixed z-50"
                style={{
                  top: Math.min(popoverPosition.y, window.innerHeight - 200),
                  left: Math.min(popoverPosition.x, window.innerWidth - 320),
                }}
              >
                <Card ref={popoverRef} className="w-80 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Create New Task</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="taskName">Task Name</Label>
                      <Input
                        id="taskName"
                        value={newTaskName}
                        onChange={e => setNewTaskName(e.target.value)}
                        placeholder="Enter task name"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === "Enter" && newTaskName.trim()) {
                            handleAddTaskFromPopover();
                          } else if (e.key === "Escape") {
                            setShowAddPopover(false);
                            setNewTaskName("");
                            setClickedDate(null);
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddPopover(false);
                          setNewTaskName("");
                          setClickedDate(null);
                        }}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddTaskFromPopover}
                        disabled={!newTaskName.trim()}
                        className="w-full sm:w-auto"
                      >
                        Create Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </GanttTimeline>
        </GanttProvider>
      </div>

      {/* TaskViewSheet */}
      {viewingTask && (
        <TaskViewSheet
          task={viewingTask}
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          width="400px"
        />
      )}
    </div>
  );
}
