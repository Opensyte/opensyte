"use client";

import React from "react";
import { Plus, FolderOpen, Lightbulb, Users, Target } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface EmptyProjectsProps {
  onCreateProject: () => void;
}

export function EmptyProjects({ onCreateProject }: EmptyProjectsProps) {
  const features = [
    {
      icon: Target,
      title: "Project Planning",
      description: "Set goals, timelines, and milestones for your projects",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Assign tasks and collaborate with your team members",
    },
    {
      icon: Lightbulb,
      title: "Task Management",
      description:
        "Break down projects into manageable tasks and track progress",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md mx-auto mb-8">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
        </div>

        <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
        <p className="text-muted-foreground mb-6">
          Get started by creating your first project. Organize your work,
          collaborate with your team, and track progress all in one place.
        </p>

        <Button onClick={onCreateProject} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Your First Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
