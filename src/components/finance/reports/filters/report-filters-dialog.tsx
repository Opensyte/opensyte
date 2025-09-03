import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  financialReportTypeLabels,
  type FinancialReportType,
} from "~/types/financial-reports";

interface ReportFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: FinancialReportType | "";
  onApplyFilters: (filters: { type?: FinancialReportType }) => void;
}

export function ReportFiltersDialog({
  open,
  onOpenChange,
  selectedType,
  onApplyFilters,
}: ReportFiltersDialogProps) {
  const [localType, setLocalType] = useState<FinancialReportType | "">(
    selectedType
  );

  const handleApply = () => {
    onApplyFilters({
      type: localType || undefined,
    });
  };

  const handleClear = () => {
    setLocalType("");
    onApplyFilters({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Reports</DialogTitle>
          <DialogDescription>
            Filter financial reports by type and other criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Report Type</Label>
            <Select
              value={localType}
              onValueChange={value =>
                setLocalType(value as FinancialReportType | "")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(financialReportTypeLabels).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear Filters
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
