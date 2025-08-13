"use client";

import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent } from "~/components/ui/card";

export function PayrollStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[0, 1, 2, 3].map(i => (
        <Card key={i}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PayrollFiltersSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PayrollTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function PayrollDialogSkeleton() {
  return (
    <div className="grid gap-4 py-2 sm:grid-cols-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
      <div className="sm:col-span-2 flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}
