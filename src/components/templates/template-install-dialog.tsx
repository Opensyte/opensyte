"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Progress } from "~/components/ui/progress";
import { toast } from "sonner";
import type { RouterOutputs } from "~/trpc/react";
import {
  TemplateManifestSchema,
  type TemplateManifest,
} from "~/types/templates";
import {
  Package,
  Settings,
  CheckCircle,
  AlertCircle,
  MapPin,
  Workflow,
  Zap,
  RefreshCw,
} from "lucide-react";

type TemplateInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  templatePackageId?: string;
  manifestOverride?: unknown; // Optional direct manifest for local testing
};

export function TemplateInstallDialog({
  open,
  onOpenChange,
  organizationId,
  templatePackageId,
  manifestOverride,
}: TemplateInstallDialogProps) {
  const [strategy, setStrategy] = useState<"MERGE" | "OVERWRITE" | "PREFIX">(
    "MERGE"
  );
  const [namePrefix, setNamePrefix] = useState("");
  const [integrationMap, setIntegrationMap] = useState<Record<string, string>>(
    {}
  );

  // Fetch template details (for preflight/manfiest extraction) if we have package id
  const detailsQuery = api.templates.getDetails.useQuery(
    { templatePackageId: templatePackageId ?? "" },
    { enabled: !!templatePackageId }
  );

  const manifest: TemplateManifest | null = useMemo(() => {
    if (manifestOverride) {
      const parsed = TemplateManifestSchema.safeParse(manifestOverride);
      if (parsed.success) return parsed.data;
    }
    const maybe = detailsQuery.data?.manifest as unknown;
    if (!maybe) return null;
    const parsed = TemplateManifestSchema.safeParse(maybe);
    return parsed.success ? parsed.data : null;
  }, [detailsQuery.data, manifestOverride]);

  // const preflightMutation = api.templates.validateManifest.useMutation();

  // Workflows integrations to map
  const requiredIntegrations: Array<{ type: string; key: string }> =
    useMemo(() => {
      return (
        manifest?.requires?.integrations?.map(i => ({
          type: String(i.type),
          key: i.key,
        })) ?? []
      );
    }, [manifest]);

  // Integration options
  const integrationsQuery = api.workflows.integrations.getIntegrations.useQuery(
    { organizationId },
    { enabled: open }
  );

  const startInstallMutation = api.templates.startInstall.useMutation();
  const utils = api.useUtils();

  const [installationId, setInstallationId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIntegrationMap({});
      setInstallationId(null);
      setNamePrefix("");
      setStrategy("MERGE");
    }
  }, [open]);

  const canStart = useMemo(() => {
    if (!manifest) return false;
    // Ensure all required integrations are mapped
    const integrationsOk = requiredIntegrations.every(
      req => !!integrationMap[`${req.type}:${req.key}`]
    );
    return integrationsOk;
  }, [manifest, requiredIntegrations, integrationMap]);

  const beginInstall = async () => {
    if (!manifest) return;
    try {
      const res = await startInstallMutation.mutateAsync({
        organizationId,
        manifest,
        strategy,
        namePrefix: namePrefix || undefined,
        templatePackageId: templatePackageId ?? undefined,
      });
      setInstallationId(res.installationId);
      toast.success("Installation started");
      // Poll status a few times (mocked streaming)
      void pollStatus(res.installationId);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to start installation";
      toast.error(message);
    }
  };

  type Installation = RouterOutputs["templates"]["getInstallationStatus"];
  const pollStatus = async (id: string) => {
    try {
      let done = false;
      while (!done) {
        const s = (await utils.templates.getInstallationStatus.fetch({
          organizationId,
          installationId: id,
        })) as Installation | undefined;
        if (!s) break;
        if (s.status === "COMPLETED" || s.status === "FAILED") {
          done = true;
          if (s.status === "COMPLETED") {
            toast.success("Template installed successfully!");
            // Auto-close dialog on successful completion
            setTimeout(() => onOpenChange(false), 1000);
          } else {
            toast.error("Installation failed");
          }
          break;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl w-full mx-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Install Template
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Configure and deploy this template to your organization
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {!manifest ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Loading template details...
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Template Overview */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Template Overview
                  </h3>

                  {/* Compatible Modules */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Compatible Modules
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(manifest.header.compatibleModules ?? []).length > 0 ? (
                        manifest.header.compatibleModules.map(module => (
                          <span
                            key={module}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full border border-blue-200 dark:border-blue-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {module.charAt(0).toUpperCase() + module.slice(1)}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm rounded-full border border-amber-200 dark:border-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          No modules specified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requirements Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                        <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {requiredIntegrations.length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Integrations
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                        <Workflow className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {(manifest.assets.workflows?.length ?? 0) +
                            (manifest.assets.reports?.length ?? 0) +
                            (manifest.assets.actionTemplates?.length ?? 0)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Assets
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integration Mapping Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Integration Mapping
                  </h3>
                </div>
                <div className="space-y-4">
                  {requiredIntegrations.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      No integrations required for this template.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Map the required integrations to your existing
                        configurations.
                      </p>
                      {requiredIntegrations.map(req => {
                        const key = `${req.type}:${req.key}`;
                        const isSelected = !!integrationMap[key];
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${isSelected ? "bg-green-500" : "bg-yellow-500"}`}
                              />
                              <label className="text-sm font-medium">
                                {req.type} Integration: {req.key}
                              </label>
                            </div>
                            <Select
                              value={integrationMap[key] ?? ""}
                              onValueChange={v =>
                                setIntegrationMap(prev => ({
                                  ...prev,
                                  [key]: v,
                                }))
                              }
                            >
                              <SelectTrigger
                                className={`w-full ${isSelected ? "border-green-300" : "border-yellow-300"}`}
                              >
                                <SelectValue placeholder="Select an integration" />
                              </SelectTrigger>
                              <SelectContent>
                                {integrationsQuery.data?.map(i => (
                                  <SelectItem key={i.id} value={i.id}>
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-3 w-3" />
                                      {i.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Installation Strategy */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Installation Strategy
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose how to handle conflicts with existing data.
                </p>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Installation Strategy
                    </label>
                    <Select
                      value={strategy}
                      onValueChange={(v: "MERGE" | "OVERWRITE" | "PREFIX") =>
                        setStrategy(v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select installation strategy">
                          {strategy && (
                            <span className="font-medium">
                              {strategy === "MERGE" && "Merge"}
                              {strategy === "OVERWRITE" && "Overwrite"}
                              {strategy === "PREFIX" && "Prefix"}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MERGE">
                          <div className="space-y-1">
                            <div className="font-medium">Merge</div>
                            <div className="text-xs text-muted-foreground">
                              Combine with existing data
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="OVERWRITE">
                          <div className="space-y-1">
                            <div className="font-medium">Overwrite</div>
                            <div className="text-xs text-muted-foreground">
                              Replace existing data
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="PREFIX">
                          <div className="space-y-1">
                            <div className="font-medium">Prefix</div>
                            <div className="text-xs text-muted-foreground">
                              Add prefix to avoid conflicts
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {strategy === "PREFIX" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name Prefix
                      </label>
                      <Input
                        placeholder="Enter prefix for asset names"
                        value={namePrefix}
                        onChange={e => setNamePrefix(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        All imported assets will be prefixed with this text.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Installation Actions */}
              <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${canStart ? "bg-green-500" : "bg-amber-500"}`}
                  />
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {canStart ? "Ready to Install" : "Configuration Required"}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {canStart
                        ? "All requirements are satisfied. Click below to start the installation."
                        : "Please complete all required configurations above before proceeding."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto"
                    disabled={startInstallMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="w-full sm:flex-1 gap-2"
                    disabled={!canStart || startInstallMutation.isPending}
                    onClick={beginInstall}
                    size="lg"
                  >
                    {startInstallMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4" />
                        Start Installation
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Installation Progress */}
              {installationId && (
                <div className="space-y-4 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Installing Template
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Please wait while we deploy your template
                      </p>
                    </div>
                  </div>

                  <Progress
                    value={startInstallMutation.isPending ? 25 : 75}
                    className="h-2"
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Installation ID:
                    </span>
                    <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs font-mono border border-gray-200 dark:border-gray-600">
                      {installationId}
                    </code>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
