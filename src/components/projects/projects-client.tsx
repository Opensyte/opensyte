"use client";

import React, { useState } from "react";
import { Plus, Search, Filter, Grid3X3, List, BarChart3 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ProjectCreateDialog } from "./project-create-dialog";
import { ProjectCard } from "./project-card";
import { ProjectsStats } from "./projects-stats";
import { EmptyProjects } from "./empty-projects";
import { api } from "~/trpc/react";

import type { ProjectStatus } from "~/types/projects";
import { projectStatusLabels } from "~/types/projects";

interface ProjectsClientProps {
  organizationId: string;
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-64">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProjectsClient({ organizationId }: ProjectsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">(
    "ALL"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // API queries
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = api.project.getAll.useQuery({ organizationId });

  const { data: stats, isLoading: statsLoading } =
    api.project.getStats.useQuery({ organizationId });

  const utils = api.useUtils();

  // Filter projects based on search and status
  const filteredProjects = React.useMemo(() => {
    if (!projects) return [];

    return projects.filter(project => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  if (projectsError) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
          <p className="font-medium text-destructive">
            Error loading projects: {projectsError.message}
          </p>
          <Button
            onClick={() => void utils.project.getAll.invalidate()}
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track your organization&apos;s projects
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <ProjectsStats stats={stats} />
      ) : null}

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={value =>
              setStatusFilter(value as ProjectStatus | "ALL")
            }
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {Object.entries(projectStatusLabels).map(([status, label]) => (
                <SelectItem key={status} value={status}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Projects Content */}
      {projectsLoading ? (
        <ProjectsSkeleton />
      ) : filteredProjects.length > 0 ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Results count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredProjects.length} project
                {filteredProjects.length !== 1 ? "s" : ""}
              </Badge>
              {searchQuery && (
                <Badge variant="outline">
                  Search: &quot;{searchQuery}&quot;
                </Badge>
              )}
              {statusFilter !== "ALL" && (
                <Badge variant="outline">
                  Status: {projectStatusLabels[statusFilter]}
                </Badge>
              )}
            </div>

            {/* Projects Grid/List */}
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  : "space-y-4"
              }
            >
              {filteredProjects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={{
                    ...project,
                    budget: project.budget ? Number(project.budget) : null,
                    currency: project.currency ?? "USD",
                  }}
                  organizationId={organizationId}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Project Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced analytics and reporting features coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : projects && projects.length === 0 ? (
        <EmptyProjects onCreateProject={() => setShowCreateDialog(true)} />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No projects found matching your criteria.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      )}

      <ProjectCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        organizationId={organizationId}
      />
    </div>
  );
}
