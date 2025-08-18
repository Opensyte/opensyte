"use client";

import { format } from "date-fns";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { reviewStatusLabels } from "~/types/hr";

interface PerformanceReview {
  id: string;
  employee: {
    firstName: string;
    lastName: string;
    department: string | null;
  };
  reviewPeriod: string;
  reviewDate: Date;
  status: string;
  performanceScore: number | null;
}

interface PerformanceTableProps {
  reviews: PerformanceReview[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function PerformanceTable({
  reviews,
  onView,
  onEdit,
  onDelete,
  isDeleting = false,
}: PerformanceTableProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No performance reviews found
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map(review => (
              <TableRow key={review.id}>
                <TableCell className="font-medium">
                  {review.employee.firstName} {review.employee.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {review.employee.department ?? "—"}
                </TableCell>
                <TableCell>{review.reviewPeriod}</TableCell>
                <TableCell>{format(review.reviewDate, "PP")}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {
                      reviewStatusLabels[
                        review.status as keyof typeof reviewStatusLabels
                      ]
                    }
                  </Badge>
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {review.performanceScore ?? "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(review.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(review.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Review
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(review.id)}
                        disabled={isDeleting}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Review
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-4 md:hidden">
        {reviews.map(review => (
          <Card key={review.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    {review.employee.firstName} {review.employee.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {review.employee.department ?? "No department"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(review.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(review.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Review
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(review.id)}
                      disabled={isDeleting}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Review
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">{review.reviewPeriod}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(review.reviewDate, "PP")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="capitalize">
                    {
                      reviewStatusLabels[
                        review.status as keyof typeof reviewStatusLabels
                      ]
                    }
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Score</p>
                  <p className="font-mono font-medium tabular-nums">
                    {review.performanceScore ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
