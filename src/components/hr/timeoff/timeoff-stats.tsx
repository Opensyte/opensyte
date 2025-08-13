"use client";

import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  CalendarRange,
} from "lucide-react";

interface TimeOffStatsData {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  currentlyOnLeave: number;
  upcomingTimeOff: number;
  timeOffByType: Array<{
    type: string;
    count: number;
    totalDays: number;
  }>;
}

interface TimeOffStatsProps {
  stats?: TimeOffStatsData;
  className?: string;
}

// Compact stats bar (no individual cards)
export function TimeOffStats({ stats, className = "" }: TimeOffStatsProps) {
  if (!stats) return null;

  const items = [
    { label: "Total", value: stats.totalRequests, icon: CalendarDays },
    { label: "Pending", value: stats.pendingRequests, icon: Clock },
    { label: "Approved", value: stats.approvedRequests, icon: CheckCircle },
    { label: "Denied", value: stats.deniedRequests, icon: XCircle },
    { label: "On Leave", value: stats.currentlyOnLeave, icon: Users },
    { label: "Upcoming", value: stats.upcomingTimeOff, icon: CalendarRange },
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
            </div>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      })}
    </div>
  );
}

export type { TimeOffStatsData };
