import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import {
  Eye,
  FileText,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  financialReportTypeLabels,
  financialReportStatusLabels,
  financialReportStatusColors,
} from "~/types/financial-reports";

// Define the filters type based on what we expect from the API
interface ReportFilters {
  dateRange?: {
    startDate?: string | Date;
    endDate?: string | Date;
  };
  categories?: string[];
  vendors?: string[];
}

interface ReportViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  reportId: string;
}

export function ReportViewDialog({
  open,
  onOpenChange,
  organizationId,
  reportId,
}: ReportViewDialogProps) {
  const { data: report, isLoading } = api.financialReports.get.useQuery(
    { reportId },
    { enabled: open && !!reportId }
  );

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!report) {
    return null;
  }

  const filters = report.filters as ReportFilters | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {report.name}
          </DialogTitle>
          <DialogDescription>
            View report details and configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Overview */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {financialReportTypeLabels[report.type]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={financialReportStatusColors[report.status]}
                      >
                        {financialReportStatusLabels[report.status]}
                      </Badge>
                      {report.isScheduled && (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-600"
                        >
                          Scheduled
                        </Badge>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(report.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Report Type</p>
                    <p className="font-medium">
                      {financialReportTypeLabels[report.type]}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <div className="grid grid-cols-1 gap-6">
            {/* Report Configuration */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Report Configuration</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Date Range</p>
                        <p>
                          {filters?.dateRange?.startDate
                            ? `${new Date(filters.dateRange.startDate).toLocaleDateString()} - `
                            : "All time - "}
                          {filters?.dateRange?.endDate
                            ? new Date(
                                filters.dateRange.endDate
                              ).toLocaleDateString()
                            : "Present"}
                        </p>
                      </div>
                      {filters?.categories && filters.categories.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">
                            Categories Filter
                          </p>
                          <p>{filters.categories.join(", ")}</p>
                        </div>
                      )}
                      {filters?.vendors && filters.vendors.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">
                            Vendors Filter
                          </p>
                          <p>{filters.vendors.join(", ")}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium">
                          {financialReportStatusLabels[report.status]}
                        </p>
                      </div>
                      {report.isScheduled && (
                        <div>
                          <p className="text-muted-foreground">Schedule</p>
                          <p>Automated report generation enabled</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Organization</p>
                        <p>{organizationId}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Information */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Report Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">About This Report</p>
                        <p className="text-sm text-muted-foreground">
                          This{" "}
                          {financialReportTypeLabels[report.type].toLowerCase()}{" "}
                          provides financial insights based on your
                          organization&apos;s data. Use the export functionality
                          in the main reports section to generate and download
                          the latest data.
                        </p>
                      </div>
                    </div>

                    {report.status === "DRAFT" && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Draft Report</AlertTitle>
                        <AlertDescription>
                          This report is still in draft status. You can edit its
                          configuration or generate it from the main reports
                          page.
                        </AlertDescription>
                      </Alert>
                    )}

                    {report.status === "COMPLETED" && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>Report Ready</AlertTitle>
                        <AlertDescription>
                          This report has been successfully generated and is
                          ready for use. You can export it or view the latest
                          data from the main reports page.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
