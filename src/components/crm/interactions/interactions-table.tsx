import React from "react";
import { Trash2, Eye } from "lucide-react";

import type { CustomerInteraction } from "~/types/crm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

interface InteractionsTableProps {
  interactions: CustomerInteraction[];
  onViewInteraction: (interaction: CustomerInteraction) => void;
  onDeleteInteraction: (id: string) => void;
  getCustomerName: (customerId: string) => string;
  formatDate: (date?: Date) => string;
}

export function InteractionsTable({
  interactions,
  onViewInteraction,
  onDeleteInteraction,
  getCustomerName,
  formatDate,
}: InteractionsTableProps) {
  // Get the badge color based on interaction type
  const getInteractionTypeColor = (type: string) => {
    switch (type) {
      case "CALL":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "EMAIL":
        return "bg-green-100 text-green-800 border-green-200";
      case "MEETING":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "NOTE":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "TASK":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const capitalizeFirstLetter = (text: string) => {
    const loweredCaseString = text.toLowerCase();
    return (
      loweredCaseString.charAt(0).toUpperCase() + loweredCaseString.slice(1)
    );
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Customer Interactions</CardTitle>
        <CardDescription>
          Manage and track all communications with your customers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px] min-w-[90px]">Type</TableHead>
                <TableHead className="w-[140px] min-w-[140px]">
                  Customer
                </TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden w-[130px] min-w-[130px] sm:table-cell">
                  Scheduled
                </TableHead>
                <TableHead className="hidden w-[130px] min-w-[130px] sm:table-cell">
                  Completed
                </TableHead>
                <TableHead className="hidden w-[130px] min-w-[130px] md:table-cell">
                  Created
                </TableHead>
                <TableHead className="w-[100px] min-w-[100px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-32 text-center"
                  >
                    No interactions found. Create your first interaction by
                    clicking the Add interaction button.
                  </TableCell>
                </TableRow>
              ) : (
                interactions.map((interaction) => (
                  <TableRow
                    key={interaction.id}
                    className="group hover:bg-muted/50"
                  >
                    <TableCell className="py-2.5">
                      <Badge
                        className={cn(
                          "px-2 py-0.5 font-medium",
                          getInteractionTypeColor(interaction.type),
                        )}
                      >
                        {capitalizeFirstLetter(interaction.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 font-medium">
                      {getCustomerName(interaction.customerId)}
                    </TableCell>
                    <TableCell className="max-w-[300px] py-2.5">
                      <span className="line-clamp-1">
                        {interaction.subject ?? "No Subject"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-2.5 text-sm sm:table-cell">
                      {formatDate(interaction.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-2.5 text-sm sm:table-cell">
                      {formatDate(interaction.completedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden py-2.5 text-sm md:table-cell">
                      {formatDate(interaction.createdAt)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onViewInteraction(interaction)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                          onClick={() => onDeleteInteraction(interaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
