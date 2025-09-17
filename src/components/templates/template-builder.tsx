"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Progress } from "~/components/ui/progress";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Package,
  FileText,
  Settings,
  Download,
  Workflow,
  BarChart3,
  Users,
  Database,
  Shield,
  Info,
  Sparkles,
} from "lucide-react";

type TemplateBuilderProps = {
  organizationId: string;
};

type AssetSelection = {
  workflowIds: string[];
  reportIds: string[];
  actionTemplateIds: string[];
  variableNames: string[];
  roleNames: string[];
  includeSeeds: boolean;
};

export function TemplateBuilder({ organizationId }: TemplateBuilderProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [selection, setSelection] = useState<AssetSelection>({
    workflowIds: [],
    reportIds: [],
    actionTemplateIds: [],
    variableNames: [],
    roleNames: [],
    includeSeeds: false,
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [compatibleModules] = useState<
    Array<"crm" | "projects" | "finance" | "hr">
  >(["crm"]);

  // Data sources
  const workflows = api.workflows.workflow.getWorkflows.useQuery({
    organizationId,
    limit: 100,
  });
  const reports = api.financialReports.list.useQuery({ organizationId });
  const actionTemplates = api.workflows.actions.getActionTemplates.useQuery({
    organizationId,
  });
  const variables = api.workflows.variables.getVariables.useQuery({
    organizationId,
  });
  const roles = api.customRoles.getOrganizationCustomRoles.useQuery({
    userId: "me",
    organizationId,
  });

  const exportMutation = api.templates.exportSelection.useMutation();
  const createPackageMutation = api.templates.createPackage.useMutation();
  const validateMutation = api.templates.validateManifest.useMutation();

  const canContinueAssets = useMemo(() => {
    return (
      selection.workflowIds.length +
        selection.reportIds.length +
        selection.actionTemplateIds.length +
        selection.variableNames.length +
        selection.roleNames.length >
      0
    );
  }, [selection]);

  const canSave = useMemo(() => {
    return name.trim().length > 0 && /^\d+\.\d+\.\d+$/.test(version);
  }, [name, version]);

  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const handleExportAndSave = async () => {
    try {
      const manifest = await exportMutation.mutateAsync({
        organizationId,
        selection: {
          workflowIds: selection.workflowIds,
          reportIds: selection.reportIds,
          actionTemplateIds: selection.actionTemplateIds,
          variableNames: selection.variableNames,
          roleNames: selection.roleNames,
          includeSeeds: selection.includeSeeds,
        },
        meta: {
          name,
          description: description || undefined,
          category: category || undefined,
          version,
          appVersion,
          compatibleModules:
            compatibleModules.length > 0
              ? (compatibleModules as [
                  "crm" | "projects" | "finance" | "hr",
                  ...Array<"crm" | "projects" | "finance" | "hr">,
                ])
              : ["crm"],
        },
      });

      const valid = await validateMutation.mutateAsync({ manifest });
      if (!valid.valid) {
        toast.error("Manifest validation failed");
        return;
      }

      await createPackageMutation.mutateAsync({
        organizationId,
        name,
        description: description || undefined,
        category: category || undefined,
        version,
        tags: [],
        manifest,
      });

      toast.success("Template package created");
      setStep(3);
      const utils = api.useUtils();
      await utils.templates.listOrg.invalidate();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to create template package";
      toast.error(message);
    }
  };

  const steps = [
    {
      id: 0,
      title: "Select Assets",
      description: "Choose components to include",
      icon: Package,
    },
    {
      id: 1,
      title: "Configure Details",
      description: "Set metadata and information",
      icon: Settings,
    },
    {
      id: 2,
      title: "Review & Validate",
      description: "Preview your template package",
      icon: FileText,
    },
    {
      id: 3,
      title: "Complete",
      description: "Template package created",
      icon: Check,
    },
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId < step) return "completed";
    if (stepId === step) return "current";
    return "pending";
  };

  return (
    <ClientPermissionGuard
      requiredPermissions={[PERMISSIONS.TEMPLATES_WRITE]}
      requiredModule="settings"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Template Builder
              </h1>
              <p className="text-muted-foreground">
                Create reusable template packages from your organization's
                assets
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Progress</h3>
                <Badge variant="outline" className="text-xs">
                  Step {step + 1} of {steps.length}
                </Badge>
              </div>

              <Progress
                value={(step / (steps.length - 1)) * 100}
                className="h-2"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                {steps.map((stepItem, index) => {
                  const status = getStepStatus(stepItem.id);
                  const Icon = stepItem.icon;

                  return (
                    <div
                      key={stepItem.id}
                      className={`flex items-center gap-3 rounded-lg p-3 transition-all ${
                        status === "current"
                          ? "bg-primary/10 border border-primary/20"
                          : status === "completed"
                            ? "bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800"
                            : "bg-muted/50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          status === "current"
                            ? "bg-primary text-primary-foreground"
                            : status === "completed"
                              ? "bg-green-500 text-white"
                              : "bg-muted-foreground/20 text-muted-foreground"
                        }`}
                      >
                        {status === "completed" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            status === "current"
                              ? "text-primary"
                              : status === "completed"
                                ? "text-green-700 dark:text-green-300"
                                : "text-muted-foreground"
                          }`}
                        >
                          {stepItem.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {stepItem.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="space-y-6">
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Select Assets
                    </h3>
                    <p className="text-muted-foreground">
                      Choose the components you want to include in your template
                      package.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Workflows */}
                    <Card className="border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                            <Workflow className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Workflows
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Automation processes
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            {selection.workflowIds.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {(workflows.data?.workflows ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No workflows available
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {(workflows.data?.workflows ?? []).map(w => (
                                <label
                                  key={w.id}
                                  className="flex items-center gap-3 rounded-md p-2 hover:bg-background/50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selection.workflowIds.includes(
                                      w.id
                                    )}
                                    onCheckedChange={() =>
                                      setSelection(s => ({
                                        ...s,
                                        workflowIds: toggle(
                                          s.workflowIds,
                                          w.id
                                        ),
                                      }))
                                    }
                                  />
                                  <span className="text-sm font-medium flex-1">
                                    {w.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reports */}
                    <Card className="border border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-green-100 dark:bg-green-900">
                            <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Reports</CardTitle>
                            <CardDescription className="text-xs">
                              Financial reports
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            {selection.reportIds.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {(reports.data ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No reports available
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {(reports.data ?? []).map(r => (
                                <label
                                  key={r.id}
                                  className="flex items-center gap-3 rounded-md p-2 hover:bg-background/50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selection.reportIds.includes(r.id)}
                                    onCheckedChange={() =>
                                      setSelection(s => ({
                                        ...s,
                                        reportIds: toggle(s.reportIds, r.id),
                                      }))
                                    }
                                  />
                                  <span className="text-sm font-medium flex-1">
                                    {r.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Templates */}
                    <Card className="border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-100 dark:bg-purple-900">
                            <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Action Templates
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Workflow actions
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            {selection.actionTemplateIds.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {(actionTemplates.data ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No action templates available
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {(actionTemplates.data ?? []).map(a => (
                                <label
                                  key={a.id ?? a.name}
                                  className="flex items-center gap-3 rounded-md p-2 hover:bg-background/50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selection.actionTemplateIds.includes(
                                      a.id ?? a.name
                                    )}
                                    onCheckedChange={() =>
                                      setSelection(s => ({
                                        ...s,
                                        actionTemplateIds: toggle(
                                          s.actionTemplateIds,
                                          String(a.id ?? a.name)
                                        ),
                                      }))
                                    }
                                  />
                                  <span className="text-sm font-medium flex-1">
                                    {a.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Variables */}
                    <Card className="border border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-orange-100 dark:bg-orange-900">
                            <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Variables
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Configuration values
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            {selection.variableNames.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {(variables.data ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No variables available
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {(variables.data ?? []).map(v => (
                                <label
                                  key={v.name}
                                  className="flex items-center gap-3 rounded-md p-2 hover:bg-background/50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selection.variableNames.includes(
                                      v.name
                                    )}
                                    onCheckedChange={() =>
                                      setSelection(s => ({
                                        ...s,
                                        variableNames: toggle(
                                          s.variableNames,
                                          v.name
                                        ),
                                      }))
                                    }
                                  />
                                  <span className="text-sm font-medium flex-1">
                                    {v.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Roles */}
                    <Card className="border border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-rose-100 dark:bg-rose-900">
                            <Shield className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Custom Roles
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Permission roles
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-auto">
                            {selection.roleNames.length}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {(roles.data ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No custom roles available
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-2">
                              {(roles.data ?? []).map(r => (
                                <label
                                  key={r.name}
                                  className="flex items-center gap-3 rounded-md p-2 hover:bg-background/50 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={selection.roleNames.includes(
                                      r.name
                                    )}
                                    onCheckedChange={() =>
                                      setSelection(s => ({
                                        ...s,
                                        roleNames: toggle(s.roleNames, r.name),
                                      }))
                                    }
                                  />
                                  <span className="text-sm font-medium flex-1">
                                    {r.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sample Data Option */}
                    <Card className="border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 lg:col-span-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 dark:bg-slate-900">
                            <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              Sample Data
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Include demo data for testing
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <label className="flex items-center gap-3 rounded-md p-2 hover:bg-background/50 cursor-pointer">
                          <Checkbox
                            checked={selection.includeSeeds}
                            onCheckedChange={() =>
                              setSelection(s => ({
                                ...s,
                                includeSeeds: !s.includeSeeds,
                              }))
                            }
                          />
                          <div>
                            <span className="text-sm font-medium">
                              Include sample data
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add demonstration data to help users understand
                              your template
                            </p>
                          </div>
                        </label>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Ready to continue?</p>
                      <p className="text-xs text-muted-foreground">
                        {canContinueAssets
                          ? "You've selected assets to include in your template."
                          : "Select at least one asset to continue."}
                      </p>
                    </div>
                    <Button
                      disabled={!canContinueAssets}
                      onClick={() => setStep(1)}
                      className="gap-2"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Configure Details
                    </h3>
                    <p className="text-muted-foreground">
                      Set up the metadata and information for your template
                      package.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Basic Information
                        </CardTitle>
                        <CardDescription>
                          Essential details about your template
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="template-name"
                            className="text-sm font-medium"
                          >
                            Template Name *
                          </Label>
                          <Input
                            id="template-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Enter template name"
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Choose a descriptive name for your template
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="template-description"
                            className="text-sm font-medium"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="template-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe what this template does..."
                            className="w-full min-h-[80px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            Help others understand when to use this template
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="template-category"
                            className="text-sm font-medium"
                          >
                            Category
                          </Label>
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CRM">CRM</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="Projects">Projects</SelectItem>
                              <SelectItem value="Automation">
                                Automation
                              </SelectItem>
                              <SelectItem value="Reports">Reports</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Categorize your template for easier discovery
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Version & Compatibility */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Version & Compatibility
                        </CardTitle>
                        <CardDescription>
                          Version information and compatibility settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="template-version"
                            className="text-sm font-medium"
                          >
                            Template Version *
                          </Label>
                          <Input
                            id="template-version"
                            value={version}
                            onChange={e => setVersion(e.target.value)}
                            placeholder="1.0.0"
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use semantic versioning (e.g., 1.0.0)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="app-version"
                            className="text-sm font-medium"
                          >
                            Minimum App Version
                          </Label>
                          <Input
                            id="app-version"
                            value={appVersion}
                            onChange={e => setAppVersion(e.target.value)}
                            placeholder="1.0.0"
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum OpenSyte version required
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Compatible Modules
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {compatibleModules.map(module => (
                              <Badge
                                key={module}
                                variant="secondary"
                                className="text-xs"
                              >
                                {module.charAt(0).toUpperCase() +
                                  module.slice(1)}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Modules this template is compatible with
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Configuration complete?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {canSave
                          ? "Ready to review your template configuration."
                          : "Please fill in the required fields to continue."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(0)}
                        className="gap-2"
                      >
                        Back
                      </Button>
                      <Button
                        disabled={!canSave}
                        onClick={() => setStep(2)}
                        className="gap-2"
                      >
                        Review
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Review & Validate
                    </h3>
                    <p className="text-muted-foreground">
                      Review your template configuration before creating the
                      package.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Template Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Template Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-muted-foreground">
                              Name:
                            </span>
                            <span className="text-sm font-semibold text-right">
                              {name || "Untitled"}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-muted-foreground">
                              Version:
                            </span>
                            <Badge variant="outline">{version}</Badge>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-muted-foreground">
                              Category:
                            </span>
                            <Badge variant="secondary">
                              {category || "Uncategorized"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-muted-foreground">
                              App Version:
                            </span>
                            <span className="text-sm">{appVersion}</span>
                          </div>
                          {description && (
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-muted-foreground">
                                Description:
                              </span>
                              <p className="text-sm bg-muted/50 rounded p-2">
                                {description}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assets Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Assets Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-100 dark:bg-blue-900">
                              <Workflow className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Workflows
                              </p>
                              <p className="text-sm font-semibold">
                                {selection.workflowIds.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-green-100 dark:bg-green-900">
                              <BarChart3 className="h-3 w-3 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Reports
                              </p>
                              <p className="text-sm font-semibold">
                                {selection.reportIds.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-100 dark:bg-purple-900">
                              <Settings className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Actions
                              </p>
                              <p className="text-sm font-semibold">
                                {selection.actionTemplateIds.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-100 dark:bg-orange-900">
                              <Database className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Variables
                              </p>
                              <p className="text-sm font-semibold">
                                {selection.variableNames.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-rose-100 dark:bg-rose-900">
                              <Shield className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Roles
                              </p>
                              <p className="text-sm font-semibold">
                                {selection.roleNames.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 dark:bg-slate-900">
                              <Users className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Sample Data
                              </p>
                              <p className="text-sm font-semibold">
                                {selection.includeSeeds ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Total Assets:
                            </span>
                            <Badge variant="outline" className="font-semibold">
                              {selection.workflowIds.length +
                                selection.reportIds.length +
                                selection.actionTemplateIds.length +
                                selection.variableNames.length +
                                selection.roleNames.length}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Ready to create template?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This will package your selected assets into a reusable
                        template.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        disabled={
                          exportMutation.isPending ||
                          createPackageMutation.isPending
                        }
                        className="gap-2"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleExportAndSave}
                        disabled={
                          !canSave ||
                          exportMutation.isPending ||
                          createPackageMutation.isPending
                        }
                        className="gap-2"
                      >
                        {exportMutation.isPending ||
                        createPackageMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Create Template
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-green-700 dark:text-green-300">
                        Template Created Successfully!
                      </h3>
                      <p className="text-muted-foreground">
                        Your template package "{name}" has been created and is
                        ready to use.
                      </p>
                    </div>
                  </div>

                  <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                    <CardHeader>
                      <CardTitle className="text-base text-green-700 dark:text-green-300">
                        What's Next?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                        <li>
                          • Your template is now available in the template
                          gallery
                        </li>
                        <li>
                          • Share it with other organizations or keep it private
                        </li>
                        <li>
                          • Install it in other organizations to replicate your
                          setup
                        </li>
                        <li>• Update it anytime by creating a new version</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="flex justify-center">
                    <Button
                      onClick={() => {
                        setStep(0);
                        setSelection({
                          workflowIds: [],
                          reportIds: [],
                          actionTemplateIds: [],
                          variableNames: [],
                          roleNames: [],
                          includeSeeds: false,
                        });
                        setName("");
                        setDescription("");
                        setCategory("");
                        setVersion("1.0.0");
                        setAppVersion("1.0.0");
                      }}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Create Another Template
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientPermissionGuard>
  );
}
