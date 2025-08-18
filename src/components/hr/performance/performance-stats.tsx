"use client";

import { Target, TrendingUp, CheckCircle, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface PerformanceStatsProps {
  stats: {
    totalReviews: number;
    submittedReviews: number;
    finalizedReviews: number;
    averageScore: number;
  };
}

export function PerformanceStats({ stats }: PerformanceStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-muted/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {stats.totalReviews}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-muted/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {stats.submittedReviews}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-muted/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {stats.finalizedReviews}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-muted/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-mono text-2xl font-bold tabular-nums">
            {stats.averageScore.toFixed(1)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
