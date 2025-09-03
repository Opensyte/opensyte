"use client";

import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  TrendingUp,
} from "lucide-react";
import type { ExpenseSummary } from "~/types/expenses";

interface ExpenseSummaryCardsProps {
  summary?: ExpenseSummary;
  isLoading: boolean;
  className?: string;
}

// Compact stats bar (no individual cards)
export function ExpenseSummaryCards({
  summary,
  isLoading,
  className = "",
}: ExpenseSummaryCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className={`grid gap-3 sm:grid-cols-3 lg:grid-cols-6 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const currentMonthAmount =
    summary.monthlyTrend?.[summary.monthlyTrend.length - 1]?.amount ?? 0;

  const items = [
    {
      label: "Total",
      value: formatCurrency(summary.totalAmount),
      icon: DollarSign,
      subtitle: `${summary.totalCount} expenses`,
    },
    {
      label: "Pending",
      value: summary.pendingApproval,
      icon: Clock,
      subtitle: "awaiting approval",
    },
    {
      label: "Approved",
      value: summary.pendingReimbursement,
      icon: CheckCircle,
      subtitle: "ready for payment",
    },
    {
      label: "This Month",
      value: formatCurrency(currentMonthAmount),
      icon: TrendingUp,
      subtitle: "current month",
    },
    {
      label: "Categories",
      value: summary.categoryBreakdown.length,
      icon: Receipt,
      subtitle: "active categories",
    },
    {
      label: "Avg/Month",
      value: formatCurrency(
        summary.monthlyTrend.length > 0
          ? summary.monthlyTrend.reduce((sum, month) => sum + month.amount, 0) /
              summary.monthlyTrend.length
          : 0
      ),
      icon: AlertCircle,
      subtitle: "average spending",
    },
  ];

  return (
    <div className={`grid gap-3 sm:grid-cols-3 lg:grid-cols-6 ${className}`}>
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
              <p className="mt-1 text-xl font-semibold tabular-nums">
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
