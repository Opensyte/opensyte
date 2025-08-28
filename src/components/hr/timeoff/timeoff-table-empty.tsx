"use client";
import { Calendar, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface TimeOffTableEmptyProps {
  onCreateClick?: () => void;
}

export function TimeOffTableEmpty({ onCreateClick }: TimeOffTableEmptyProps) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-6">
            <Calendar className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              No time-off requests found
            </h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Get started by creating your first time-off request, or adjust
              your filters to view existing requests.
            </p>
          </div>
          {onCreateClick && (
            <Button onClick={onCreateClick} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
