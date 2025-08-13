"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Clock,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  timeOffStatusLabels,
  timeOffStatusColors,
  timeOffTypeLabels,
  type TimeOffTableProps,
  type TimeOffWithEmployee,
} from "~/types/hr";
import { TimeOffTableEmpty } from "./timeoff-table-empty";
import { TimeOffDeleteDialog } from "./timeoff-delete-dialog";

export function TimeOffTable({
  data,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}: TimeOffTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TimeOffWithEmployee | null>(
    null
  );

  const handleDeleteClick = (item: TimeOffWithEmployee) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  if (data.length === 0) {
    return <TimeOffTableEmpty />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(item => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {item.employee.firstName} {item.employee.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.employee.department ?? "No Department"} •{" "}
                        {item.employee.position ?? "No Position"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {timeOffTypeLabels[item.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">
                        {format(item.startDate, "MMM dd, yyyy")}
                      </span>
                      <span className="text-muted-foreground">
                        to {format(item.endDate, "MMM dd, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {item.duration} {item.duration === 1 ? "day" : "days"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`capitalize ${timeOffStatusColors[item.status]}`}
                      variant="outline"
                    >
                      {timeOffStatusLabels[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate text-sm">
                      {item.reason ?? "—"}
                    </div>
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onView(item.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(item.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(item)}
                          className="text-red-600 hover:text-red-700"
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile and Tablet Cards */}
      <div className="grid gap-4 lg:hidden">
        {data.map(item => (
          <Card key={item.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {item.employee.firstName} {item.employee.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.employee.department ?? "No Department"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onView(item.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(item.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(item)}
                        className="text-red-600 hover:text-red-700"
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status and Type */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={`capitalize text-xs ${timeOffStatusColors[item.status]}`}
                    variant="outline"
                  >
                    {timeOffStatusLabels[item.status]}
                  </Badge>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {timeOffTypeLabels[item.type]}
                  </Badge>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Duration
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {item.duration} {item.duration === 1 ? "day" : "days"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Dates
                    </span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">
                        {format(item.startDate, "MMM dd")} -{" "}
                        {format(item.endDate, "MMM dd")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {item.reason && (
                  <div className="border-t pt-3">
                    <span className="text-muted-foreground text-sm block mb-1">
                      Reason
                    </span>
                    <p className="text-sm leading-relaxed">{item.reason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <TimeOffDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        timeOff={itemToDelete}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
