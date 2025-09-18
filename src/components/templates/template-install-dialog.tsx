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
import { Separator } from "~/components/ui/separator";
import { Progress } from "~/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  Info,
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
          if (s.status === "COMPLETED") toast.success("Installation completed");
          else toast.error("Installation failed");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[90vw] w-full">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Install Template Package
              </DialogTitle>
              <DialogDescription>
                Configure and install this template in your organization
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {!manifest ? (
            <Card className="border-2">
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-muted-foreground">
                    Loading template details...
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Template Overview */}
              <Card className="border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-lg">Template Overview</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Compatible Modules */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Compatible Modules
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(manifest.header.compatibleModules ?? []).length > 0 ? (
                        manifest.header.compatibleModules.map(module => (
                          <div
                            key={module}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-md"
                          >
                            <CheckCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                              {module.charAt(0).toUpperCase() + module.slice(1)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
                          <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-xs text-yellow-700 dark:text-yellow-300">
                            No modules specified
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Requirements Summary */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                      <MapPin className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                      <div className="text-sm font-medium">
                        {requiredIntegrations.length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Integrations
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                      <Workflow className="h-5 w-5 mx-auto mb-1 text-green-600" />
                      <div className="text-sm font-medium">
                        {(manifest.assets.workflows?.length ?? 0) +
                          (manifest.assets.reports?.length ?? 0) +
                          (manifest.assets.actionTemplates?.length ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assets
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Integration Mapping Section */}
              <Card className="border-2 border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-lg">
                      Integration Mapping
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Installation Strategy */}
              <Card className="border-2 border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <CardTitle className="text-lg">
                      Installation Strategy
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose how to handle conflicts with existing data.
                  </p>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">
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
                      <label className="text-sm font-medium">Name Prefix</label>
                      <Input
                        placeholder="Enter prefix for asset names"
                        value={namePrefix}
                        onChange={e => setNamePrefix(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        All imported assets will be prefixed with this text.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Installation Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Ready to Install?</h3>
                    <p className="text-sm text-muted-foreground">
                      {canStart
                        ? "All requirements are satisfied. You can proceed with the installation."
                        : "Please complete all required configurations above."}
                    </p>
                  </div>
                  <div
                    className={`h-3 w-3 rounded-full ${canStart ? "bg-green-500" : "bg-red-500"}`}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={!canStart || startInstallMutation.isPending}
                  onClick={beginInstall}
                  size="lg"
                >
                  {startInstallMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Starting Installation...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      Start Installation
                    </>
                  )}
                </Button>
              </div>

              {/* Installation Progress */}
              {installationId && (
                <Card className="border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                      <CardTitle className="text-lg">
                        Installation in Progress
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress
                      value={startInstallMutation.isPending ? 25 : 75}
                      className="h-3"
                    />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Installation ID:</span>
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                          {installationId}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Please wait while we install your template. This may
                        take a few moments.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
