"use client";
import { Skeleton } from "~/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function PipelineSkeleton() {
  return (
    <div className="space-y-6">
      {/* Pipeline metrics skeleton */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-4 md:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-3 shadow-sm">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="px-4 pt-4 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Pipeline board skeleton */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Pipeline columns */}
          {Array.from({ length: 5 }).map((_, columnIndex) => (
            <div key={columnIndex} className="min-h-[600px] space-y-4">
              {/* Column header */}
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>

              {/* Deal cards skeleton */}
              <div className="space-y-3">
                {Array.from({ length: Math.floor(Math.random() * 4) + 1 }).map(
                  (_, cardIndex) => (
                    <Card
                      key={cardIndex}
                      className="cursor-pointer transition-all hover:shadow-md"
                    >
                      <CardHeader className="pb-3">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-28" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
