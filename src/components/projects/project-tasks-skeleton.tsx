"use client";

import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function ProjectTasksSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-4 md:px-6">
        <div className="flex space-x-8">
          <div className="flex items-center gap-2 border-b-2 border-primary pb-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center gap-2 pb-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex items-center gap-2 pb-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 p-4 md:p-6 md:pb-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-28" />
        <div className="ml-auto">
          <Skeleton className="h-10 w-64" />
        </div>
      </div>

      {/* Task Table */}
      <div className="flex-1 overflow-auto px-4 md:px-6">
        <Table>
          <TableHeader>
            <TableRow className="border-b">
              <TableHead className="w-8">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead className="w-8">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead className="min-w-[200px]">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="w-24">
                <Skeleton className="h-4 w-14" />
              </TableHead>
              <TableHead className="w-32">
                <Skeleton className="h-4 w-12" />
              </TableHead>
              <TableHead className="w-24">
                <Skeleton className="h-4 w-18" />
              </TableHead>
              <TableHead className="w-8">
                <Skeleton className="h-4 w-4" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i} className="hover:bg-muted/50">
                {/* Checkbox */}
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>

                {/* Priority */}
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>

                {/* Task Name */}
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </TableCell>

                {/* Assignee */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </TableCell>

                {/* Due Date */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </TableCell>

                {/* Priority Text */}
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>

                {/* Comments */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-2" />
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
