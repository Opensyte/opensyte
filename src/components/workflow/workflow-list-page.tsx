"use client";

import { useEffect, useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

type WorkflowSummary = RouterOutputs["workflows"]["prebuilt"]["list"]["workflows"][number];
type WorkflowDetail = RouterOutputs["workflows"]["prebuilt"]["detail"];

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
  const [subjectDraft, setSubjectDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [isTemplateDirty, setIsTemplateDirty] = useState(false);
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
      workflowKey: (selectedKey ?? "lead-to-client") as WorkflowSummary["key"],
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

  const updateTemplateMutation =
    api.workflows.prebuilt.updateTemplate.useMutation({
      onSuccess: (_result, variables) => {
        toast.success("Template updated");
        setIsTemplateDirty(false);
        void Promise.all([
          utils.workflows.prebuilt.detail.invalidate({
            organizationId,
            workflowKey: variables.workflowKey,
          }),
          utils.workflows.prebuilt.list.invalidate({ organizationId }),
        ]);
      },
      onError: error => {
        toast.error("Unable to save template", {
          description: error.message,
        });
      },
    });

  const workflows = workflowsData?.workflows ?? [];
  const detailData = detailQuery.data;

  useEffect(() => {
    if (!detailData || !isDialogOpen) {
      return;
    }
    setSubjectDraft(detailData.emailTemplate.subject);
    setBodyDraft(detailData.emailTemplate.body);
    setIsTemplateDirty(false);
  }, [detailData?.emailTemplate.subject, detailData?.emailTemplate.body, isDialogOpen]);

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
      setIsTemplateDirty(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!selectedKey) {
      return;
    }

    const subject = subjectDraft.trim();
    const body = bodyDraft.trim();

    if (!subject || !body) {
      toast.error("Subject and body are required");
      return;
    }

    updateTemplateMutation.mutate({
      organizationId,
      workflowKey: selectedKey,
      subject,
      body,
    });
  };

  const handleResetTemplate = () => {
    if (!detailData) {
      return;
    }

    setSubjectDraft(detailData.emailTemplate.defaultSubject);
    setBodyDraft(detailData.emailTemplate.defaultBody);
    setIsTemplateDirty(true);
  };

  if (isLoadingWorkflows) {
    return <WorkflowListSkeleton />;
  }

  if (workflowsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <CardContent>
            <div className="text-destructive mb-4">
              <AlertTriangle className="h-8 w-8 mx-auto" />
            </div>
            <CardTitle className="mb-2">Failed to load workflows</CardTitle>
            <CardDescription className="mb-4">
              {workflowsError.message}
            </CardDescription>
            <Button
              variant="outline"
              onClick={() =>
                void utils.workflows.prebuilt.list.invalidate({ organizationId })
              }
            >
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="p-8 text-center max-w-md">
            <CardContent>
              <div className="text-muted-foreground mb-4">
                <Sparkles className="h-8 w-8 mx-auto" />
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
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Prebuilt Workflows</h2>
          <p className="text-muted-foreground">
            Enable curated automations and customize the outgoing email messages for your team.
          </p>
        </div>
        <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <Mail className="h-4 w-4" />
          <AlertTitle>Email automation only</AlertTitle>
          <AlertDescription>
            SMS, Slack, and webhook channels are temporarily disabled while we transition to the new prebuilt experience.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 md:grid-cols-2">
          {workflows.map(workflow => {
            const Icon = getIconComponent(workflow.icon);
            const isTogglePending = pendingToggleKey === workflow.key;
            return (
              <Card key={workflow.key} className="flex flex-col justify-between">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg leading-tight">
                          {workflow.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {workflow.shortDescription}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={workflow.enabled ? "default" : "secondary"}>
                      {workflow.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {workflow.moduleDependencies.map(module => (
                      <Badge key={module} variant="outline">
                        {module}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{workflow.highlight}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Email preview:</span> {workflow.emailPreview}
                  </p>
                  {workflow.missingPermissions.length > 0 && (
                    <Alert variant="destructive" className="text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Additional permissions required</AlertTitle>
                      <AlertDescription>
                        {workflow.missingPermissions.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => handleToggle(workflow)}
                      disabled={!workflow.canToggle || isTogglePending}
                    >
                      {isTogglePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : workflow.enabled ? (
                        "Disable"
                      ) : (
                        "Enable"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => handleOpenDetail(workflow)}
                    >
                      View details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {detailQuery.isFetching && !detailData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData ? (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle>{detailData.title}</DialogTitle>
                <DialogDescription>{detailData.shortDescription}</DialogDescription>
                <div className="flex flex-wrap gap-2">
                  {detailData.moduleDependencies.map(module => (
                    <Badge key={module} variant="outline">
                      {module}
                    </Badge>
                  ))}
                </div>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">Trigger</h3>
                  <p className="text-sm text-foreground">{detailData.trigger}</p>
                </section>
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">What happens</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {detailData.actions.map(action => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </section>
                {detailData.missingPermissions.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Enable blocked</AlertTitle>
                    <AlertDescription>
                      {detailData.missingPermissions.join(", ")}
                    </AlertDescription>
                  </Alert>
                )}
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">Email template</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize the subject and message sent when this workflow runs. Placeholders use double curly braces.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="prebuilt-workflow-subject">Subject</Label>
                      <Input
                        id="prebuilt-workflow-subject"
                        value={subjectDraft}
                        onChange={event => {
                          setSubjectDraft(event.target.value);
                          setIsTemplateDirty(true);
                        }}
                        disabled={!detailData.canEditTemplate || updateTemplateMutation.isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prebuilt-workflow-body">Message</Label>
                      <Textarea
                        id="prebuilt-workflow-body"
                        value={bodyDraft}
                        onChange={event => {
                          setBodyDraft(event.target.value);
                          setIsTemplateDirty(true);
                        }}
                        rows={10}
                        disabled={!detailData.canEditTemplate || updateTemplateMutation.isPending}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Placeholders:</span> {detailData.emailTemplate.variables.map(variable => `{{${variable.token}}}`).join(", ")}
                    </div>
                  </div>
                </section>
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleResetTemplate()}
                  disabled={!detailData.canEditTemplate || updateTemplateMutation.isPending}
                >
                  Reset to default
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSaveTemplate}
                  disabled={
                    !detailData.canEditTemplate ||
                    !isTemplateDirty ||
                    updateTemplateMutation.isPending
                  }
                >
                  {updateTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Unable to load workflow details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ClientPermissionGuard>
  );
}

function WorkflowListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-14 w-full max-w-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:space-x-2">
              <Skeleton className="h-9 w-full sm:w-24" />
              <Skeleton className="h-9 w-full sm:w-24" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
