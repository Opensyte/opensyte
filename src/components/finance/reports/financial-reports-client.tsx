"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  PermissionButton,
  WithPermissions,
} from "~/components/shared/permission-button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  BarChart3,
  Shield,
  Calendar,
  FileText,
  Eye,
  Clock,
  Play,
} from "lucide-react";
import { ReportCreateDialog } from "./dialogs/report-create-dialog";
import { ReportEditDialog } from "./dialogs/report-edit-dialog";
import { ReportDeleteDialog } from "./dialogs/report-delete-dialog";
import { ReportViewDialog } from "./dialogs/report-view-dialog";
import { ReportExportDialog } from "./dialogs/report-export-dialog";
import { ReportFiltersDialog } from "./filters/report-filters-dialog";
import { ReportSkeletons } from "./report-skeletons";
import { ReportSummaryCards } from "./report-summary-cards";
import {
  financialReportTypeLabels,
  financialReportStatusLabels,
  financialReportStatusColors,
  type FinancialReportType,
  type FinancialReportsClientProps,
  type ReportFilters,
} from "~/types/financial-reports";
import { toast } from "sonner";
import { usePermissions } from "~/hooks/use-permissions";
import { authClient } from "~/lib/auth-client";

export function FinancialReportsClient({
  organizationId,
}: FinancialReportsClientProps) {
  // Authentication and permissions
  const { data: session } = authClient.useSession();
  const permissions = usePermissions({
    userId: session?.user.id ?? "",
    organizationId,
  });

  // State
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<FinancialReportType | "">(
    ""
  );
  const [openCreate, setOpenCreate] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  // API
  const utils = api.useUtils();
  const { data: reports, isLoading } = api.financialReports.list.useQuery({
    organizationId,
    type: selectedType || undefined,
  });

  const generateMutation = api.financialReports.generate.useMutation();

  // Filtered reports based on search
  const filteredReports = useMemo(() => {
    if (!reports) return [];
    if (!search) return reports;

    const searchLower = search.toLowerCase();
    return reports.filter(
      report =>
        report.name.toLowerCase().includes(searchLower) ||
        (report.description?.toLowerCase().includes(searchLower) ?? false) ||
        financialReportTypeLabels[report.type]
          .toLowerCase()
          .includes(searchLower)
    );
  }, [reports, search]);

  const handleGenerateReport = async (reportId: string) => {
    try {
      const report = reports?.find(r => r.id === reportId);
      if (!report) {
        toast.error("Report not found");
        return;
      }

      // Show loading state
      toast.loading("Generating report...", { id: `generate-${reportId}` });

      // Prepare filters with proper date conversion
      const reportFilters = report.filters as ReportFilters | null;
      const filters = {
        dateRange: {
          startDate: new Date(
            reportFilters?.dateRange?.startDate ?? new Date()
          ),
          endDate: new Date(reportFilters?.dateRange?.endDate ?? new Date()),
        },
        ...reportFilters,
      };

      const result = await generateMutation.mutateAsync({
        organizationId,
        reportId,
        type: report.type,
        filters,
      });

      // Dismiss loading toast
      toast.dismiss(`generate-${reportId}`);

      if (result?.success) {
        toast.success("Report generated successfully");
        void utils.financialReports.list.invalidate();
      } else {
        toast.error("Failed to generate report - unexpected response");
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(`generate-${reportId}`);

      console.error("Generate report error:", error);
      toast.error("Failed to generate report - please try again");
    }
  };

  const clearFilters = () => {
    setSelectedType("");
    setSearch("");
  };

  const hasFilters = selectedType || search;

  // Permission check
  if (!permissions.canReadFinance && !permissions.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Financial Reports</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Access Restricted</p>
              <p className="text-muted-foreground">
                You don&apos;t have permission to view financial reports. Please
                contact your administrator to request access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Financial Reports</h2>
            <p className="text-sm text-muted-foreground">
              Generate and manage comprehensive financial statements
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <PermissionButton
              userId={session?.user.id ?? ""}
              organizationId={organizationId}
              requiredPermission="write"
              module="finance"
              onClick={() => setOpenCreate(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </PermissionButton>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
            <Input
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-full sm:max-w-sm"
            />
            {hasFilters && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Filters active
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-2"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenFilters(true)}
              className="w-full sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasFilters && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex justify-center items-center"
                >
                  1
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <ReportSummaryCards reports={reports} isLoading={isLoading} />

      {/* Reports Table */}
      {isLoading ? (
        <ReportSkeletons />
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No reports found</h3>
                <p className="text-muted-foreground">
                  {hasFilters || search
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first financial report"}
                </p>
              </div>
              {!hasFilters && !search && (
                <PermissionButton
                  userId={session?.user.id ?? ""}
                  organizationId={organizationId}
                  requiredPermission="write"
                  module="finance"
                  onClick={() => setOpenCreate(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </PermissionButton>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-muted/20">
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Name
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Created
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Updated
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold w-20">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map(report => (
                      <TableRow
                        key={report.id}
                        className="border-border/40 transition-colors hover:bg-muted/30 group"
                      >
                        <TableCell className="font-medium py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-sm text-foreground">
                              {report.name}
                            </p>
                            {report.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary border-primary/20 font-medium"
                          >
                            {financialReportTypeLabels[report.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`${financialReportStatusColors[report.status]} font-medium`}
                          >
                            {financialReportStatusLabels[report.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">
                              {new Date(report.updatedAt).toLocaleDateString()}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.updatedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => setViewingReport(report.id)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Report
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleGenerateReport(report.id)}
                                className="cursor-pointer"
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Generate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setExportingReport(report.id)}
                                className="cursor-pointer"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Export
                              </DropdownMenuItem>
                              <WithPermissions
                                userId={session?.user.id ?? ""}
                                organizationId={organizationId}
                                requiredPermission="write"
                                module="finance"
                              >
                                <DropdownMenuItem
                                  onClick={() => setEditingReport(report.id)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              </WithPermissions>
                              <WithPermissions
                                userId={session?.user.id ?? ""}
                                organizationId={organizationId}
                                requiredPermission="write"
                                module="finance"
                              >
                                <DropdownMenuItem
                                  onClick={() => setDeletingReport(report.id)}
                                  className="text-red-600 focus:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </WithPermissions>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredReports.map(report => (
              <Card
                key={report.id}
                className="p-4 border border-border/40 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {report.name}
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-xs text-muted-foreground">
                          {report.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={financialReportStatusColors[report.status]}
                    >
                      {financialReportStatusLabels[report.status]}
                    </Badge>
                  </div>

                  {/* Type and Last Generated */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {financialReportTypeLabels[report.type]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(report.createdAt).toLocaleDateString()}{" "}
                      • Updated:{" "}
                      {new Date(report.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingReport(report.id)}
                        className="h-8 px-3"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateReport(report.id)}
                        className="h-8 px-3"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Generate
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setExportingReport(report.id)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </DropdownMenuItem>
                          <WithPermissions
                            userId={session?.user.id ?? ""}
                            organizationId={organizationId}
                            requiredPermission="write"
                            module="finance"
                          >
                            <DropdownMenuItem
                              onClick={() => setEditingReport(report.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </WithPermissions>
                          <WithPermissions
                            userId={session?.user.id ?? ""}
                            organizationId={organizationId}
                            requiredPermission="write"
                            module="finance"
                          >
                            <DropdownMenuItem
                              onClick={() => setDeletingReport(report.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </WithPermissions>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ReportCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        organizationId={organizationId}
        onCreated={() => {
          void utils.financialReports.list.invalidate();
        }}
      />

      <ReportFiltersDialog
        open={openFilters}
        onOpenChange={setOpenFilters}
        selectedType={selectedType}
        onApplyFilters={filters => {
          setSelectedType(filters.type ?? "");
          setOpenFilters(false);
        }}
      />

      {editingReport && (
        <ReportEditDialog
          open={!!editingReport}
          onOpenChange={(open: boolean) => !open && setEditingReport(null)}
          report={reports?.find(r => r.id === editingReport) ?? null}
          onUpdated={() => {
            void utils.financialReports.list.invalidate();
          }}
        />
      )}

      {deletingReport && (
        <ReportDeleteDialog
          open={!!deletingReport}
          onOpenChange={(open: boolean) => !open && setDeletingReport(null)}
          organizationId={organizationId}
          reportId={deletingReport}
          onDeleted={() => {
            void utils.financialReports.list.invalidate();
          }}
        />
      )}

      {viewingReport && (
        <ReportViewDialog
          open={!!viewingReport}
          onOpenChange={(open: boolean) => !open && setViewingReport(null)}
          organizationId={organizationId}
          reportId={viewingReport}
        />
      )}

      {exportingReport && (
        <ReportExportDialog
          open={!!exportingReport}
          onOpenChange={(open: boolean) => !open && setExportingReport(null)}
          reportId={exportingReport}
          onExported={() => {
            void utils.financialReports.list.invalidate();
          }}
        />
      )}
    </div>
  );
}
