"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Eye,
  LayoutGrid,
  Save,
  Palette,
  Layers,
  User,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { formatDistance } from "date-fns";
import { useState } from "react";
import type { ViewConfiguration } from "~/types/ai";

interface GeneratedView {
  id: string;
  role: string;
  configuration: ViewConfiguration;
  metrics: Record<string, unknown>;
  insights: Array<{
    type: "alert" | "opportunity" | "trend" | "prediction";
    title: string;
    description: string;
    confidence: number;
    priority: "low" | "medium" | "high" | "critical";
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    impact: "low" | "medium" | "high";
    effort: "low" | "medium" | "high";
    category: string;
    action: string;
  }>;
  lastUpdated: Date;
}

interface PersonalizedViewsProps {
  organizationId: string;
  userId: string;
  role: string;
  generatedViews?: GeneratedView[];
  isLoading?: boolean;
  onGenerateView?: (role: string) => void;
  onRefreshView?: (viewId: string) => void;
  onSave?: (config: ViewConfiguration) => void;
  className?: string;
}

export function PersonalizedViews({
  role,
  generatedViews = [],
  isLoading,
  onGenerateView,
  onRefreshView,
  onSave,
  className = "",
}: PersonalizedViewsProps) {
  const [selectedView, setSelectedView] = useState<GeneratedView | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateView = () => {
    if (onGenerateView) {
      setIsGenerating(true);
      onGenerateView(role);
      // Reset generating state after delay
      setTimeout(() => setIsGenerating(false), 3000);
    }
  };

  const getPriorityColor = (
    priority: "low" | "medium" | "high" | "critical"
  ) => {
    switch (priority) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "high":
        return "text-orange-600 dark:text-orange-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getImpactColor = (impact: "low" | "medium" | "high") => {
    switch (impact) {
      case "high":
        return "text-green-600 dark:text-green-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "low":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const currentView = selectedView ?? generatedViews[0];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Personalized Views
            </CardTitle>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* View Generation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Personalized Views
              <Badge variant="secondary" className="ml-2">
                {generatedViews.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {generatedViews.length > 1 && (
                <Select
                  value={currentView?.id ?? ""}
                  onValueChange={viewId => {
                    const view = generatedViews.find(v => v.id === viewId);
                    setSelectedView(view ?? null);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    {generatedViews.map(view => (
                      <SelectItem key={view.id} value={view.id}>
                        {view.role} Dashboard
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={handleGenerateView}
                size="sm"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate View
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!currentView ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                No personalized views yet
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Generate a personalized dashboard tailored to your {role} role
              </p>
              <Button
                onClick={handleGenerateView}
                size="sm"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate First View
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="recommendations">
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 p-1.5 bg-primary/10 rounded-full text-primary" />
                    <div>
                      <h3 className="font-medium">
                        {currentView.role} Dashboard
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Last updated{" "}
                        {formatDistance(
                          new Date(currentView.lastUpdated),
                          new Date(),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                  {onRefreshView && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRefreshView(currentView.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentView.configuration.widgets.map((widget, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {widget.title}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Priority {widget.priority}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          Type: {widget.type.replace("_", " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Size: {widget.size}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                {currentView.insights.length === 0 ? (
                  <div className="text-center py-8">
                    <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No insights available for this view
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentView.insights.map((insight, index) => (
                      <div key={index} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2">
                            <Badge
                              variant={
                                insight.type === "alert"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="mt-0.5"
                            >
                              {insight.type}
                            </Badge>
                            <div>
                              <h4 className="font-medium text-sm">
                                {insight.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-xs font-medium ${getPriorityColor(insight.priority)}`}
                            >
                              {insight.priority.toUpperCase()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Math.round(insight.confidence * 100)}% confidence
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {currentView.recommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No recommendations available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentView.recommendations.map((rec, index) => (
                      <div key={index} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-sm">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.description}
                            </p>
                          </div>
                          <Badge variant="outline">{rec.category}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Impact:
                              </span>
                              <span className={getImpactColor(rec.impact)}>
                                {rec.impact.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">
                                Effort:
                              </span>
                              <span className="text-foreground">
                                {rec.effort.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            {rec.action}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="configuration" className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Configuration Details</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      Widgets: {currentView.configuration.widgets.length}
                    </div>
                    <div>
                      Metrics: {currentView.configuration.metrics.length}
                    </div>
                    <div>
                      Insights: {currentView.configuration.insights.length}
                    </div>
                    <div>
                      Quick Actions:{" "}
                      {currentView.configuration.quickActions.length}
                    </div>
                  </div>
                </div>

                {onSave && (
                  <div className="flex justify-end">
                    <Button onClick={() => onSave(currentView.configuration)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
