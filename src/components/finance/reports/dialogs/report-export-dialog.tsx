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
import { Checkbox } from "~/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

interface ReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  onExported: () => void;
}

/**
 * Dialog UI for exporting a financial report as a CSV file.
 *
 * Opens a modal that lets the user choose export options (currently: include period comparisons)
 * and download the report as a CSV. Fetches the report when opened, triggers a server-side export,
 * creates a CSV blob in the browser, and starts a file download. On successful export the dialog
 * is closed and the `onExported` callback is invoked.
 *
 * @param onExported - Called after a successful export and download has been initiated.
 */
export function ReportExportDialog({
  open,
  onOpenChange,
  reportId,
  onExported,
}: ReportExportDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [includeComparisons, setIncludeComparisons] = useState(false);

  const { data: report } = api.financialReports.get.useQuery(
    { reportId },
    { enabled: open && !!reportId }
  );

  const exportReport = api.financialReports.export.useMutation();

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await exportReport.mutateAsync({
        reportId,
        format: "csv",
        options: {
          includeComparisons,
        },
      });

      // Create and download the CSV file
      if (result.csvContent) {
        const blob = new Blob([result.csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", result.fileName);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      toast.success("Report exported as CSV successfully");
      onExported();
      onOpenChange(false);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Export {report?.name} as CSV data for download.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">CSV Data</p>
                <p className="text-sm text-muted-foreground">
                  Raw data export for analysis and integration
                </p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="includeComparisons"
                  checked={includeComparisons}
                  onCheckedChange={checked =>
                    setIncludeComparisons(checked === true)
                  }
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="includeComparisons">
                    Include Period Comparisons
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add previous period comparison data to the export
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p>
              The CSV file will be downloaded directly to your device and
              contains raw data that can be imported into spreadsheet
              applications or analysis tools.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            {isLoading ? "Exporting..." : "Download CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
