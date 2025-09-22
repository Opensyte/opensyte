"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { FolderOpen, Play, CheckCircle2, ListTodo } from "lucide-react";

interface ProjectsStatsProps {
  stats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
}

export function ProjectsStats({ stats }: ProjectsStatsProps) {
  const {
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    completedTasks,
    completionRate,
  } = stats;

  const projectCompletionRate =
    totalProjects > 0
      ? Math.round((completedProjects / totalProjects) * 100)
      : 0;

  const statsCards = [
    {
      title: "Total Projects",
      value: totalProjects,
      icon: FolderOpen,
      description: "All projects in organization",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Projects",
      value: activeProjects,
      icon: Play,
      description: "Currently in progress",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Completed Projects",
      value: completedProjects,
      icon: CheckCircle2,
      description: `${projectCompletionRate}% completion rate`,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      description: `${completedTasks} completed`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>

              {/* Progress indicators for specific cards */}
              {stat.title === "Completed Projects" && totalProjects > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {projectCompletionRate}%
                    </span>
                  </div>
                  <Progress value={projectCompletionRate} className="h-1" />
                </div>
              )}

              {stat.title === "Total Tasks" && totalTasks > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-1" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
