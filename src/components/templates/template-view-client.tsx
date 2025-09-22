"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
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
import { TemplateInstallDialog } from "./template-install-dialog";
import { TemplateManifestSchema } from "~/types/templates";
import type { TemplateManifest } from "~/types/templates";
import { useState } from "react";
import { SystemTemplateService } from "~/lib/system-templates";
import {
  Package,
  Download,
  Clock,
  GitBranch,
  Tag,
  Info,
  Shield,
  Workflow,
  BarChart3,
  Settings,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Eye,
  ArrowLeft,
} from "lucide-react";

type TemplateViewClientProps = {
  organizationId: string;
  templateId: string;
};

export function TemplateViewClient({
  organizationId,
  templateId,
}: TemplateViewClientProps) {
  const router = useRouter();
  const [installOpen, setInstallOpen] = useState(false);

  const templateQuery = api.templates.getDetails.useQuery({
    templatePackageId: templateId,
  });

  const template = templateQuery.data;
  const manifest = useMemo<TemplateManifest | null>(() => {
    if (!template?.manifest) return null;
    const parsed = TemplateManifestSchema.safeParse(template.manifest);
    return parsed.success ? parsed.data : null;
  }, [template]);

  const resolvedActionTemplates = useMemo(() => {
    if (!manifest) return [] as Array<{ name: string; description?: string }>;
    return manifest.assets.actionTemplates.map(at => {
      const nm = at.name;
      const sysId = at.templateId;
      if (nm) return { name: nm, description: at.description };
      if (sysId && SystemTemplateService.isSystemTemplate(sysId)) {
        const sys = SystemTemplateService.findById(sysId);
        if (sys) return { name: sys.name, description: sys.description };
      }
      return { name: sysId ?? "Action" };
    });
  }, [manifest]);

  const getAssetCount = useCallback(
    (type: string) => {
      if (!manifest) return 0;
      switch (type) {
        case "workflows":
          return manifest.assets.workflows.length;
        case "reports":
          return manifest.assets.reports.length;
        case "actionTemplates":
          return manifest.assets.actionTemplates.length;
        case "roles":
          return manifest.assets.rbac.roles.length;
        case "projects":
          return manifest.assets.projects.length;
        case "invoices":
          return manifest.assets.invoices.length;
        default:
          return 0;
      }
    },
    [manifest]
  );

  const totalAssets = useMemo(() => {
    if (!manifest) return 0;
    return (
      getAssetCount("workflows") +
      getAssetCount("reports") +
      getAssetCount("actionTemplates") +
      getAssetCount("roles") +
      getAssetCount("projects") +
      getAssetCount("invoices")
    );
  }, [manifest, getAssetCount]);

  const handleInstall = () => {
    setInstallOpen(true);
  };

  if (templateQuery.isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (templateQuery.error || !template) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <div>
              <h1 className="text-2xl font-bold text-destructive">
                Template Not Found
              </h1>
              <p className="text-muted-foreground mt-2">
                The requested template could not be found or you don&apos;t have
                permission to view it.
              </p>
            </div>
            <Button onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 flex-1">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <Eye className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  {template.name}
                </h1>
                <div className="flex items-center gap-2">
                  {template.category && (
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {template.category}
                    </Badge>
                  )}
                  {template.version && (
                    <Badge
                      variant="secondary"
                      className="text-xs sm:text-sm font-mono"
                    >
                      v{template.version}
                    </Badge>
                  )}
                </div>
              </div>
              {template.description && (
                <div
                  className="text-base lg:text-lg text-muted-foreground leading-relaxed prose prose-sm lg:prose-base max-w-none mb-4 
                    prose-ul:list-disc prose-ul:ml-6 prose-ol:list-decimal prose-ol:ml-6 
                    prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 
                    prose-blockquote:pl-4 prose-blockquote:italic prose-h1:text-xl prose-h1:font-bold 
                    prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-medium
                    prose-strong:font-bold prose-em:italic"
                  dangerouslySetInnerHTML={{ __html: template.description }}
                />
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created {new Date(template.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    Updated{" "}
                    {new Date(
                      template.updatedAt ?? template.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{totalAssets} assets</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={handleInstall} className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Install Template
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Information */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Template Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Status
                    </span>
                  </div>
                  <Badge
                    variant={
                      template.status === "PUBLISHED"
                        ? "default"
                        : template.status === "DRAFT"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-sm"
                  >
                    {template.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Assets
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{totalAssets}</p>
                </div>
              </div>

              {manifest?.header.compatibleModules && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Compatible Modules
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {manifest.header.compatibleModules.map(module => (
                      <Badge key={module} variant="outline" className="text-sm">
                        {module.charAt(0).toUpperCase() + module.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(template.tags as string[])?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(template.tags as string[]).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-sm"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assets Breakdown */}
          {manifest && totalAssets > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Included Assets
                </CardTitle>
                <CardDescription>
                  Components and resources included in this template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {getAssetCount("workflows") > 0 && (
                    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                            <Workflow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Workflows ({getAssetCount("workflows")})
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Automation processes included in this template
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {manifest?.assets.workflows
                            .slice(0, 5)
                            .map((workflow, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-background/60 rounded border"
                              >
                                <Workflow className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium">
                                  {(
                                    workflow as {
                                      workflow?: { name?: string };
                                      name?: string;
                                    }
                                  ).workflow?.name ??
                                    (workflow as { name?: string }).name ??
                                    "Workflow"}
                                </span>
                                {(
                                  workflow as {
                                    workflow?: { description?: string };
                                  }
                                ).workflow?.description && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    -{" "}
                                    {
                                      (
                                        workflow as {
                                          workflow?: { description?: string };
                                        }
                                      ).workflow?.description
                                    }
                                  </span>
                                )}
                              </div>
                            ))}
                          {getAssetCount("workflows") > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              ... and {getAssetCount("workflows") - 5} more
                              workflows
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {getAssetCount("reports") > 0 && (
                    <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                            <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Reports ({getAssetCount("reports")})
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Financial reports and analytics included
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {manifest?.assets.reports
                            .slice(0, 5)
                            .map((report, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-background/60 rounded border"
                              >
                                <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium">
                                  {(report as { name?: string }).name ??
                                    "Report"}
                                </span>
                                {(report as { description?: string })
                                  .description && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    -{" "}
                                    {
                                      (report as { description?: string })
                                        .description
                                    }
                                  </span>
                                )}
                              </div>
                            ))}
                          {getAssetCount("reports") > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              ... and {getAssetCount("reports") - 5} more
                              reports
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {getAssetCount("actionTemplates") > 0 && (
                    <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                            <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Action Templates (
                              {getAssetCount("actionTemplates")})
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Workflow action templates for automation
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {resolvedActionTemplates
                            .slice(0, 5)
                            .map((action, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-background/60 rounded border"
                              >
                                <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-sm font-medium">
                                  {action.name}
                                </span>
                                {(action as { description?: string })
                                  .description && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    -{" "}
                                    {
                                      (action as { description?: string })
                                        .description
                                    }
                                  </span>
                                )}
                              </div>
                            ))}
                          {getAssetCount("actionTemplates") > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              ... and {getAssetCount("actionTemplates") - 5}{" "}
                              more action templates
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {getAssetCount("roles") > 0 && (
                    <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900">
                            <Shield className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Custom Roles ({getAssetCount("roles")})
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Custom permission roles and access controls
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {manifest?.assets.rbac.roles
                            .slice(0, 5)
                            .map((role, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 p-2 bg-background/60 rounded border"
                              >
                                <Shield className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                <span className="text-sm font-medium">
                                  {role.name}
                                </span>
                                {role.description && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    - {role.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          {getAssetCount("roles") > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              ... and {getAssetCount("roles") - 5} more roles
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {getAssetCount("projects") > 0 && (
                    <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
                            <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Projects ({getAssetCount("projects")})
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Project templates with tasks and configurations
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {manifest?.assets.projects
                            ?.slice(0, 5)
                            .map((project, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center gap-2 p-2 bg-background/60 rounded border">
                                  <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-sm font-medium">
                                    {project.name}
                                  </span>
                                  {project.description && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      - {project.description}
                                    </span>
                                  )}
                                </div>
                                {project.tasks?.length > 0 && (
                                  <div className="ml-6 text-xs text-muted-foreground">
                                    Includes {project.tasks.length} task
                                    {project.tasks.length !== 1 ? "s" : ""}
                                  </div>
                                )}
                              </div>
                            ))}
                          {getAssetCount("projects") > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              ... and {getAssetCount("projects") - 5} more
                              projects
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {getAssetCount("invoices") > 0 && (
                    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">
                              Invoice Templates ({getAssetCount("invoices")})
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Invoice templates and billing configurations
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {manifest?.assets.invoices
                            ?.slice(0, 5)
                            .map((invoice, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center gap-2 p-2 bg-background/60 rounded border">
                                  <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                  <span className="text-sm font-medium">
                                    {(invoice as { invoiceNumber?: string })
                                      .invoiceNumber ?? "Invoice Template"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {
                                      (
                                        invoice as unknown as {
                                          template: {
                                            currency?: string;
                                            paymentTerms?: string;
                                          };
                                        }
                                      ).template.currency
                                    }{" "}
                                    •{" "}
                                    {
                                      (
                                        invoice as unknown as {
                                          template: { paymentTerms?: string };
                                        }
                                      ).template.paymentTerms
                                    }
                                  </span>
                                </div>
                                {invoice.items?.length > 0 && (
                                  <div className="ml-6 text-xs text-muted-foreground">
                                    {invoice.items.length} sample item
                                    {invoice.items.length !== 1 ? "s" : ""}
                                  </div>
                                )}
                              </div>
                            ))}
                          {getAssetCount("invoices") > 5 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              ... and {getAssetCount("invoices") - 5} more
                              invoice templates
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Installation
              </CardTitle>
              <CardDescription>
                Install this template to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ready to install?</p>
                  <p className="text-xs text-muted-foreground">
                    This will add all template assets to your organization
                  </p>
                </div>
                <Button onClick={handleInstall} className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Install Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          {manifest?.requires && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Requirements
                </CardTitle>
                <CardDescription>
                  Prerequisites for this template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {manifest.requires.permissions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Required Permissions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {manifest.requires.permissions.map(
                        (permission, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {permission}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

                {manifest.requires.integrations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Required Integrations
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {manifest.requires.integrations.map(
                        (integration, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {integration.key}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}

                {!manifest.requires.permissions?.length &&
                  !manifest.requires.integrations?.length && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No special requirements needed
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Install Dialog */}
      <TemplateInstallDialog
        templatePackageId={templateId}
        organizationId={organizationId}
        open={installOpen}
        onOpenChange={setInstallOpen}
      />
    </div>
  );
}
