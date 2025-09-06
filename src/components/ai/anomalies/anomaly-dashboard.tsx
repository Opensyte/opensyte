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
  Zap,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Filter,
  Eye,
  Clock,
  Scan,
} from "lucide-react";
import { formatDistance } from "date-fns";
import { useState } from "react";
import type { AnomalyDetectionResult } from "~/types/ai";

interface AnomalyDashboardProps {
  organizationId: string;
  anomalyResults?: AnomalyDetectionResult[];
  isLoading: boolean;
  filterType?: "all" | "financial" | "hr" | "operational";
  severityFilter?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  onFilterTypeChange?: (
    type: "all" | "financial" | "hr" | "operational"
  ) => void;
  onSeverityFilterChange?: (
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined
  ) => void;
  onRunDetection?: (dataType: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export function AnomalyDashboard({
  anomalyResults = [],
  isLoading,
  filterType = "all",
  severityFilter,
  onFilterTypeChange,
  onSeverityFilterChange,
  onRunDetection,
  onRefresh,
  className = "",
}: AnomalyDashboardProps) {
  const [isRunning, setIsRunning] = useState(false);

  const getSeverityColor = (
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getRiskLevelColor = (
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ) => {
    switch (riskLevel) {
      case "CRITICAL":
        return "text-red-600 dark:text-red-400";
      case "HIGH":
        return "text-orange-600 dark:text-orange-400";
      case "MEDIUM":
        return "text-yellow-600 dark:text-yellow-400";
      case "LOW":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getSeverityIcon = (
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ) => {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return AlertTriangle;
      case "MEDIUM":
        return TrendingDown;
      case "LOW":
        return Zap;
      default:
        return Zap;
    }
  };

  const handleRunDetection = (dataType: string) => {
    if (onRunDetection) {
      setIsRunning(true);
      onRunDetection(dataType);
      // Reset running state after a delay
      setTimeout(() => setIsRunning(false), 2000);
    }
  };

  // Flatten all anomalies from results for filtering
  const allAnomalies = anomalyResults.flatMap((result, resultIndex) =>
    result.anomalies.map((anomaly, anomalyIndex) => ({
      id: `${resultIndex}-${anomalyIndex}`,
      ...anomaly,
      riskLevel: result.riskLevel,
      detectedAt: new Date(), // In real implementation, this would come from the result
    }))
  );

  const filteredAnomalies = allAnomalies.filter(anomaly => {
    if (severityFilter && anomaly.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  const severityCounts = allAnomalies.reduce(
    (acc, anomaly) => {
      acc[anomaly.severity] = (acc[anomaly.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const overallRiskLevel =
    anomalyResults.length > 0
      ? anomalyResults.reduce(
          (highest, result) => {
            const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
            const currentLevel = levels.indexOf(result.riskLevel);
            const highestLevel = levels.indexOf(highest);
            return currentLevel > highestLevel ? result.riskLevel : highest;
          },
          "LOW" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
        )
      : "LOW";

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Anomaly Detection
            </CardTitle>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Risk Summary */}
      {anomalyResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Overall Risk Level
                </div>
                <div
                  className={`text-lg font-semibold ${getRiskLevelColor(overallRiskLevel)}`}
                >
                  {overallRiskLevel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">
                  Total Anomalies
                </div>
                <div className="text-lg font-semibold">
                  {allAnomalies.length}
                </div>
              </div>
            </div>

            {anomalyResults.map((result, index) => (
              <div key={index} className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium mb-1">Analysis Summary</div>
                <p className="text-sm text-muted-foreground">
                  {result.summary}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detection Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Anomaly Detection
              <Badge variant="secondary" className="ml-2">
                {filteredAnomalies.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={severityFilter ?? "all"}
                onValueChange={value =>
                  onSeverityFilterChange?.(
                    value === "all"
                      ? undefined
                      : (value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
                  )
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
              {onRunDetection && (
                <Button
                  size="sm"
                  onClick={() => handleRunDetection("financial")}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      Scan
                    </>
                  )}
                </Button>
              )}
              {onRefresh && (
                <Button variant="ghost" size="sm" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Refresh</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={filterType}
            onValueChange={value =>
              onFilterTypeChange?.(
                value as "all" | "financial" | "hr" | "operational"
              )
            }
          >
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="hr">HR</TabsTrigger>
              <TabsTrigger value="operational">Operations</TabsTrigger>
            </TabsList>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
                severity => (
                  <div
                    key={severity}
                    className="p-3 rounded-lg border bg-muted/30 text-center"
                  >
                    <div
                      className={`text-sm font-medium ${
                        severity === "CRITICAL"
                          ? "text-red-600"
                          : severity === "HIGH"
                            ? "text-orange-600"
                            : severity === "MEDIUM"
                              ? "text-yellow-600"
                              : "text-green-600"
                      }`}
                    >
                      {severityCounts[severity] ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {severity.toLowerCase()}
                    </div>
                  </div>
                )
              )}
            </div>

            <TabsContent value={filterType} className="space-y-3">
              {filteredAnomalies.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {severityFilter
                      ? `No ${severityFilter.toLowerCase()} severity anomalies detected`
                      : "No anomalies detected"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Your data appears to be normal
                  </p>
                  {onRunDetection && (
                    <Button
                      size="sm"
                      onClick={() => handleRunDetection("financial")}
                      disabled={isRunning}
                    >
                      <Scan className="h-4 w-4 mr-2" />
                      Run Detection
                    </Button>
                  )}
                </div>
              ) : (
                filteredAnomalies.map((anomaly, index) => {
                  const SeverityIcon = getSeverityIcon(anomaly.severity);

                  return (
                    <div
                      key={anomaly.id ?? index}
                      className="group p-4 rounded-lg border transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <SeverityIcon
                            className={`h-4 w-4 mt-0.5 ${
                              anomaly.severity === "CRITICAL"
                                ? "text-red-500"
                                : anomaly.severity === "HIGH"
                                  ? "text-orange-500"
                                  : anomaly.severity === "MEDIUM"
                                    ? "text-yellow-500"
                                    : "text-green-500"
                            }`}
                          />
                          <div>
                            <h4 className="font-medium text-sm">
                              {anomaly.type}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {anomaly.description}
                            </p>
                          </div>
                        </div>
                        <Badge className={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Filter className="h-3 w-3" />
                            {anomaly.items.length} items affected
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistance(
                              new Date(anomaly.detectedAt),
                              new Date(),
                              {
                                addSuffix: true,
                              }
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
