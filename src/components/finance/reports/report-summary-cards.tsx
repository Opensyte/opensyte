"use client";

import { BarChart3, FileText, TrendingUp, Clock } from "lucide-react";
import { financialReportTypeLabels } from "~/types/financial-reports";
import type { FinancialReport } from "@prisma/client";

interface ReportSummaryCardsProps {
  reports?: FinancialReport[];
  isLoading: boolean;
  className?: string;
}

// Compact stats bar following expense-summary-cards pattern
export function ReportSummaryCards({
  reports,
  isLoading,
  className = "",
}: ReportSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className={`grid gap-3 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border bg-muted/30 p-3 flex items-start justify-between animate-pulse"
          >
            <div>
              <div className="h-3 w-12 bg-muted rounded mb-2"></div>
              <div className="h-6 w-8 bg-muted rounded"></div>
            </div>
            <div className="h-4 w-4 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalReports = reports?.length ?? 0;
  const generatedReports = reports?.filter(r => r.generatedAt).length ?? 0;
  const recentReports =
    reports?.filter(r => {
      if (!r.generatedAt) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.generatedAt) > weekAgo;
    }).length ?? 0;

  // Group by type and get most common
  const typeCount =
    reports?.reduce(
      (acc, report) => {
        acc[report.type] = (acc[report.type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};

  const mostCommonType =
    Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const items = [
    {
      label: "Total",
      value: totalReports,
      icon: FileText,
      subtitle: `${totalReports} reports`,
    },
    {
      label: "Generated",
      value: generatedReports,
      icon: BarChart3,
      subtitle: "with data",
    },
    {
      label: "Recent",
      value: recentReports,
      icon: TrendingUp,
      subtitle: "this week",
    },
    {
      label: "Popular Type",
      value: mostCommonType
        ? (financialReportTypeLabels[
            mostCommonType as keyof typeof financialReportTypeLabels
          ]?.split(" ")[0] ?? "None")
        : "None",
      icon: Clock,
      subtitle: "most used",
      isText: true,
    },
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="rounded-md border bg-muted/30 p-3 flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide">
                {item.label}
              </p>
              <p
                className={`mt-1 font-semibold tabular-nums ${item.isText ? "text-sm" : "text-xl"}`}
              >
                {item.value}
              </p>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.subtitle}
                </p>
              )}
            </div>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      })}
    </div>
  );
}
