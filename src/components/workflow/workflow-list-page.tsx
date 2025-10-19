"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Handshake,
  ClipboardList,
  Receipt,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Loader2,
  Mail,
  Settings2,
  Zap,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

type WorkflowSummary =
  RouterOutputs["workflows"]["prebuilt"]["list"]["workflows"][number];
const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Handshake,
  ClipboardList,
  Receipt,
  RefreshCw,
  BarChart3,
};

function getIconComponent(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? Sparkles;
}

interface WorkflowListPageProps {
  organizationId: string;
}

export function WorkflowListPage({ organizationId }: WorkflowListPageProps) {
  const utils = api.useUtils();
  const [selectedKey, setSelectedKey] = useState<WorkflowSummary["key"] | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingToggleKey, setPendingToggleKey] = useState<string | null>(null);

  const {
    data: workflowsData,
    isLoading: isLoadingWorkflows,
    error: workflowsError,
  } = api.workflows.prebuilt.list.useQuery(
    { organizationId },
    { enabled: organizationId.length > 0 }
  );

  const detailQuery = api.workflows.prebuilt.detail.useQuery(
    {
      organizationId,
      workflowKey: selectedKey ?? "lead-to-client",
    },
    {
      enabled: isDialogOpen && selectedKey !== null,
    }
  );

  const toggleWorkflowMutation = api.workflows.prebuilt.toggle.useMutation({
    onMutate: variables => {
      setPendingToggleKey(variables.workflowKey);
    },
    onSuccess: (result, variables) => {
      toast.success(result.enabled ? "Workflow enabled" : "Workflow disabled");
      void utils.workflows.prebuilt.list.invalidate({ organizationId });
      if (variables.workflowKey === selectedKey) {
        void utils.workflows.prebuilt.detail.invalidate({
          organizationId,
          workflowKey: variables.workflowKey,
        });
      }
    },
    onError: error => {
      toast.error("Unable to update workflow", {
        description: error.message,
      });
    },
    onSettled: () => {
      setPendingToggleKey(null);
    },
  });

  const workflows = workflowsData?.workflows ?? [];
  const detailData = detailQuery.data;

  const handleToggle = (workflow: WorkflowSummary) => {
    if (!workflow.canToggle) {
      toast.error("You do not have permission to update this workflow");
      return;
    }

    toggleWorkflowMutation.mutate({
      organizationId,
      workflowKey: workflow.key,
      enabled: !workflow.enabled,
    });
  };

  const handleOpenDetail = (workflow: WorkflowSummary) => {
    setSelectedKey(workflow.key);
    setIsDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedKey(null);
    }
  };

  if (isLoadingWorkflows) {
    return <WorkflowListSkeleton />;
  }

  if (workflowsError) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Card className="max-w-md border-destructive/50">
          <CardContent className="p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle>Failed to Load Workflows</CardTitle>
              <CardDescription className="text-base">
                {workflowsError.message}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                void utils.workflows.prebuilt.list.invalidate({
                  organizationId,
                })
              }
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.WORKFLOWS_READ,
        PERMISSIONS.WORKFLOWS_WRITE,
        PERMISSIONS.WORKFLOWS_ADMIN,
      ]}
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Card className="max-w-md border-muted">
            <CardContent className="p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-muted p-3">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="mb-2">Access Denied</CardTitle>
              <CardDescription>
                You do not have permission to view workflows.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Header Section */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Prebuilt Workflows
            </h1>
          </div>
          <p className="text-base text-muted-foreground">
            Automate your business processes with smart, pre-configured
            workflows
          </p>
        </div>

        {/* Info Banner */}
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">
            Email automation only
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            SMS, Slack, and webhook channels are temporarily disabled while we
            transition to the new prebuilt experience.
          </AlertDescription>
        </Alert>

        {/* Action Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-6 font-normal">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {workflows.filter(w => w.enabled).length} Active
            </Badge>
            <Badge variant="outline" className="h-6 font-normal">
              {workflows.length} Total
            </Badge>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link href={`/${organizationId}/workflows/message-templates`}>
              <Settings2 className="h-4 w-4" />
              Manage Templates
            </Link>
          </Button>
        </div>

        {/* Workflows Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map(workflow => {
            const Icon = getIconComponent(workflow.icon);
            const isTogglePending = pendingToggleKey === workflow.key;
            return (
              <Card
                key={workflow.key}
                className="group relative overflow-hidden transition-all hover:shadow-md"
              >
                {/* Status Indicator */}
                <div
                  className={`absolute left-0 top-0 h-1 w-full ${
                    workflow.enabled
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : "bg-muted"
                  }`}
                />

                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-2.5 ${
                          workflow.enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base leading-tight">
                            {workflow.title}
                          </CardTitle>
                          {(workflow.title === "Contract Renewal / Retainer" ||
                            workflow.title === "Internal Health Dashboard") && (
                            <Badge
                              variant="secondary"
                              className="h-5 text-xs font-normal bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            >
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          {workflow.shortDescription}
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  {/* Module Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {workflow.moduleDependencies.map(module => (
                      <Badge
                        key={module}
                        variant="secondary"
                        className="h-5 text-xs font-normal"
                      >
                        {module}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Highlight */}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {workflow.highlight}
                  </p>

                  {/* Email Preview */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      Email Preview
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-foreground">
                      {workflow.emailPreview}
                    </p>
                  </div>

                  {/* Permission Warning */}
                  {workflow.missingPermissions.length > 0 && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <AlertTitle className="text-xs">
                        Missing Permissions
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {workflow.missingPermissions.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`workflow-${workflow.key}`}
                        checked={workflow.enabled}
                        onCheckedChange={() => handleToggle(workflow)}
                        disabled={
                          !workflow.canToggle ||
                          isTogglePending ||
                          workflow.title === "Contract Renewal / Retainer" ||
                          workflow.title === "Internal Health Dashboard"
                        }
                      />
                      <Label
                        htmlFor={`workflow-${workflow.key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {isTogglePending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : workflow.enabled ? (
                          <span className="text-green-600 dark:text-green-500">
                            Active
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </Label>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => handleOpenDetail(workflow)}
                    >
                      Configure
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {detailQuery.isFetching && !detailData ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading workflow details...
                </p>
              </div>
            </div>
          ) : detailData ? (
            <>
              {/* Dialog Header */}
              <div className="border-b bg-muted/30 px-6 py-5">
                <DialogHeader className="space-y-3">
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-xl p-3 ${
                        detailData.enabled
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {(() => {
                        const Icon = getIconComponent(
                          detailData.icon ?? "Sparkles"
                        );
                        return <Icon className="h-6 w-6" />;
                      })()}
                    </div>
                    <div className="flex-1 space-y-2">
                      <DialogTitle className="text-2xl">
                        {detailData.title}
                      </DialogTitle>
                      <DialogDescription className="text-base">
                        {detailData.shortDescription}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detailData.moduleDependencies.map(module => (
                      <Badge
                        key={module}
                        variant="secondary"
                        className="font-normal"
                      >
                        {module}
                      </Badge>
                    ))}
                    <Badge
                      variant={detailData.enabled ? "default" : "outline"}
                      className="font-normal"
                    >
                      {detailData.enabled ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </div>
                </DialogHeader>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto px-6 py-6 space-y-6 flex-1">
                {/* Trigger Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Trigger Event
                    </h3>
                  </div>
                  <Card className="border-muted bg-muted/30">
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">
                        {detailData.trigger}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Actions Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Automated Actions
                    </h3>
                  </div>
                  <Card className="border-muted bg-muted/30">
                    <CardContent className="p-4">
                      <ul className="space-y-2.5">
                        {detailData.actions.map((action, index) => {
                          // Check if this is a coming soon feature for invoice tracking
                          const isComingSoon =
                            detailData.key === "invoice-tracking" && index > 1;

                          return (
                            <li
                              key={index}
                              className="flex items-start gap-3 text-sm"
                            >
                              <CheckCircle2
                                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                                  isComingSoon
                                    ? "text-muted-foreground"
                                    : "text-green-600 dark:text-green-500"
                                }`}
                              />
                              <div className="flex items-center gap-2 flex-1 leading-relaxed">
                                <span
                                  className={
                                    isComingSoon ? "text-muted-foreground" : ""
                                  }
                                >
                                  {action}
                                </span>
                                {isComingSoon && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                  >
                                    Coming Soon
                                  </Badge>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Permission Warning */}
                {detailData.missingPermissions.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Cannot Enable Workflow</AlertTitle>
                    <AlertDescription>
                      Missing required permissions:{" "}
                      {detailData.missingPermissions.join(", ")}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Email Template Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Email Template
                        </h3>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Custom email templates will be available soon. Currently
                      using the default template for this workflow.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Default Template Info */}
                    <Card className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-5 text-xs">
                                Default
                              </Badge>
                              <span className="text-sm font-medium">
                                {detailData.title} Email
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Pre-configured email template optimized for this
                              workflow
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Email Preview */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Email Preview
                      </Label>
                      <div className="space-y-3">
                        {/* Subject Preview */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            <Label className="text-xs font-medium text-foreground">
                              Subject Line
                            </Label>
                          </div>
                          <Card className="border-muted bg-background">
                            <CardContent className="p-3">
                              <p className="text-sm font-medium">
                                {detailData.emailTemplate.defaultSubject}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                        {/* Body Preview */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-primary" />
                            <Label className="text-xs font-medium text-foreground">
                              Email Body
                            </Label>
                          </div>
                          <Card className="border-muted bg-background">
                            <CardContent className="p-4">
                              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                {detailData.emailTemplate.defaultBody}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>

                    {/* Available Placeholders */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Dynamic Variables
                        </Label>
                        <Badge variant="secondary" className="text-xs">
                          {detailData.emailTemplate.variables.length} available
                        </Badge>
                      </div>
                      <Card className="border-muted bg-muted/30">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              These dynamic variables are automatically replaced
                              with real values when emails are sent.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {detailData.emailTemplate.variables.map(
                                variable => (
                                  <div
                                    key={variable.token}
                                    className="rounded-lg border bg-background p-2.5 hover:border-primary/50 transition-colors"
                                  >
                                    <div className="space-y-1.5">
                                      <code className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                                        {`{{${variable.token}}}`}
                                      </code>
                                      <p className="text-xs font-medium text-foreground">
                                        {variable.label}
                                      </p>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {variable.description}
                                      </p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="flex-shrink-0 border-t bg-muted/30 px-6 py-4">
                <DialogFooter>
                  <Button
                    onClick={() => handleDialogChange(false)}
                    className="w-full sm:w-auto"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            </>
          ) : (
            <div className="py-20 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Unable to load workflow details
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientPermissionGuard>
  );
}

function WorkflowListSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Alert Skeleton */}
      <Skeleton className="h-20 w-full" />

      {/* Action Bar Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="h-1 w-full bg-muted" />
            <CardHeader className="space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Separator />
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
