"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";
import {
  taskStatusColors,
  taskStatusLabels,
  taskPriorityColors,
  type TaskWithRelations,
} from "~/types/projects";

interface TaskViewSheetProps {
  isOpen: boolean;
  width?: string;
  onClose: () => void;
  task: TaskWithRelations;
}

export default function TaskViewSheet({
  task,
  isOpen,
  onClose,
  width = "400px",
}: TaskViewSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      console.log({task})
      // Small delay to ensure the element is rendered before animation
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Focus trap implementation
  useEffect(() => {
    const handleTabKey = (event: KeyboardEvent) => {
      if (!isOpen || event.key !== "Tab") return;

      if (event.shiftKey) {
        // If shift+tab and focus is on first element, move to last element
        if (
          document.activeElement === sheetRef.current?.querySelector("button")
        ) {
          event.preventDefault();
          const tabElement = sheetRef.current?.querySelector("[tabindex='0']");
          if (tabElement) {
            (tabElement as HTMLElement).focus();
          }
        }
      } else {
        // If tab and focus is on last element, move to first element
        if (
          document.activeElement ===
          sheetRef.current?.querySelector("[tabindex='0']")
        ) {
          event.preventDefault();
          (sheetRef.current?.querySelector("button") as HTMLElement).focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => {
      document.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen]);

  if (!shouldRender || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={`flex-1 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`flex h-full w-full max-w-sm flex-col bg-background shadow-xl transition-transform duration-300 ease-in-out border-l sm:max-w-md ${
          isAnimating ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/50 px-6 py-4">
          <h2
            id="sheet-title"
            className="text-lg font-semibold text-foreground"
          >
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close task details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Task Content Area */}
          <div className="p-6 space-y-4">
            {/* Task Title */}
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {task.title}
              </h1>

              {/* Task Description */}
              <div className="text-muted-foreground text-sm">
                {task.description ?? "No description provided"}
              </div>
            </div>
          </div>

          {/* Properties Section */}
          <div className="border-t px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Properties
            </h2>

            <div className="space-y-4">
              {/* State */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <div
                      className={`w-3 h-3 rounded-full ${taskStatusColors[task.status]}`}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    State
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      task.status === "TODO"
                        ? "bg-blue-500"
                        : task.status === "IN_PROGRESS"
                          ? "bg-yellow-500"
                          : task.status === "REVIEW"
                            ? "bg-purple-500"
                            : task.status === "DONE"
                              ? "bg-green-500"
                              : task.status === "ARCHIVED"
                                ? "bg-gray-400"
                                : "bg-gray-300"
                    }`}
                  ></div>
                  <span className="text-sm text-foreground">
                    {taskStatusLabels[task.status] ?? task.status}
                  </span>
                </div>
              </div>

              {/* Assignees */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Assignees
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      {task.assignee.image ? (
                        <img
                          src={task.assignee.image}
                          alt={task.assignee.name}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-foreground">
                        {task.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Unassigned
                    </span>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Priority
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${taskPriorityColors[task.priority] ?? "text-muted-foreground"}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* Start date */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Start date
                  </span>
                </div>
                <span className="text-sm text-foreground">
                  {task.startDate
                    ? format(task.startDate, "MMM dd, yyyy")
                    : "No start date"}
                </span>
              </div>

              {/* Due date */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Due date
                  </span>
                </div>
                <span className="text-sm text-foreground">
                  {task.dueDate
                    ? format(task.dueDate, "MMM dd, yyyy")
                    : "No due date"}
                </span>
              </div>

              {/* Project */}
              {task.project && (
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      Modules
                    </span>
                  </div>
                  <span className="text-sm text-foreground">
                    {task.project.name}
                  </span>
                </div>
              )}

              {/* Time tracking section */}
              {(task.estimatedHours ?? task.actualHours) && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Time Tracking
                    </h3>

                    {task.estimatedHours && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">
                          Estimated Hours
                        </span>
                        <span className="text-sm text-foreground">
                          {task.estimatedHours}h
                        </span>
                      </div>
                    )}

                    {task.actualHours && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">
                          Actual Hours
                        </span>
                        <span className="text-sm text-foreground">
                          {task.actualHours}h
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab trap element */}
        <div tabIndex={0} className="sr-only" aria-hidden="true" />
      </div>
    </div>
  );
}
