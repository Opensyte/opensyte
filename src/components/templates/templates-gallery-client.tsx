"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { PERMISSIONS } from "~/lib/rbac";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { TemplateInstallDialog } from "./template-install-dialog";
import { TemplateManifestSchema } from "~/types/templates";
import {
  Package,
  Search,
  Download,
  Star,
  Clock,
  Users,
  GitBranch,
  Sparkles,
  Tag,
  Info,
} from "lucide-react";

type TemplatesGalleryClientProps = {
  organizationId: string;
};

export function TemplatesGalleryClient({
  organizationId,
}: TemplatesGalleryClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [visibility, setVisibility] = useState<"public" | "org" | "all">("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [installOpen, setInstallOpen] = useState(false);

  const publicQuery = api.templates.listPublic.useQuery({ limit: 50 });
  const orgQuery = api.templates.listOrg.useQuery(
    { organizationId },
    { enabled: !!organizationId }
  );

  const isLoading = publicQuery.isLoading || orgQuery.isLoading;
  const error = publicQuery.error ?? orgQuery.error;

  const templates = useMemo(() => {
    const pub = publicQuery.data ?? [];
    const org = orgQuery.data ?? [];
    let combined =
      visibility === "public"
        ? pub
        : visibility === "org"
          ? org
          : [...pub, ...org];

    if (search) {
      const q = search.toLowerCase();
      combined = combined.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false) ||
          (t.tags as string[])?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (category && category !== "all") {
      combined = combined.filter(t => (t.category ?? "") === category);
    }

    if (moduleFilter && moduleFilter !== "all") {
      combined = combined.filter(t => {
        const parsed = TemplateManifestSchema.safeParse(
          (t as unknown as { manifest?: unknown }).manifest
        );
        const mods: string[] = parsed.success
          ? parsed.data.header.compatibleModules
          : [];
        return mods.includes(moduleFilter);
      });
    }

    return combined;
  }, [
    publicQuery.data,
    orgQuery.data,
    visibility,
    search,
    category,
    moduleFilter,
  ]);

  const onInstall = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setInstallOpen(true);
  };

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Failed to load templates. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <ClientPermissionGuard
      requiredPermissions={[PERMISSIONS.TEMPLATES_READ]}
      requiredModule="settings"
    >
      <div className="w-full">
        {/* Advanced Search and Filters */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-8">
          {/* Filter Header */}
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">
                    Discover Templates
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Find the perfect template for your needs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {templates.length} result{templates.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>

          {/* Search and Filters Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Main Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search templates by name, description, tags, or features..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-12 h-12 text-lg border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Visibility Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Visibility
                  </label>
                  <Select
                    value={visibility}
                    onValueChange={(v: "public" | "org" | "all") =>
                      setVisibility(v)
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Templates
                        </div>
                      </SelectItem>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Public Only
                        </div>
                      </SelectItem>
                      <SelectItem value="org">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Organization Only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="CRM">CRM</SelectItem>
                      <SelectItem value="Projects">Projects</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Automation">Automation</SelectItem>
                      <SelectItem value="Reports">Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Module Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Compatible Module
                  </label>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="crm">CRM</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort/Additional Options */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Sort By
                  </label>
                  <Select defaultValue="newest">
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Loading Templates...</h3>
                <p className="text-muted-foreground">
                  Discovering amazing templates for you
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl border border-border p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-32 h-32 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                No templates found
              </h3>
              <p className="text-muted-foreground mb-6">
                We couldn&apos;t find any templates matching your search
                criteria. Try adjusting your filters or search terms.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setModuleFilter("all");
                  setVisibility("all");
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Available Templates</h3>
                  <p className="text-muted-foreground">
                    {templates.length} template
                    {templates.length !== 1 ? "s" : ""} ready to install
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map(t => {
                const parsed = TemplateManifestSchema.safeParse(
                  (t as unknown as { manifest?: unknown }).manifest
                );
                const compatibleModules = parsed.success
                  ? parsed.data.header.compatibleModules
                  : [];
                const templateTags = (t.tags as string[] | undefined) ?? [];

                return (
                  <div
                    key={t.id}
                    className="group bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {/* Template Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground truncate text-lg">
                              {t.name}
                            </h4>
                            {t.category && (
                              <Badge
                                variant="outline"
                                className="text-xs shrink-0"
                              >
                                {t.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                            {t.description ?? "No description available"}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs font-mono shrink-0 ml-3"
                        >
                          v{t.version ?? "1.0.0"}
                        </Badge>
                      </div>

                      {/* Compatible Modules */}
                      {compatibleModules.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1 mb-2">
                            <Info className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Compatible with
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {compatibleModules.slice(0, 3).map(m => (
                              <Badge
                                key={m}
                                variant="secondary"
                                className="text-xs"
                              >
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                              </Badge>
                            ))}
                            {compatibleModules.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{compatibleModules.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {templateTags.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1 mb-2">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Tags
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {templateTags.slice(0, 2).map(tag => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {templateTags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{templateTags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Updated Date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated{" "}
                          {new Date(
                            t.updatedAt ?? t.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Install Button */}
                    <div className="px-6 pb-6">
                      <ClientPermissionGuard
                        requiredPermissions={[PERMISSIONS.TEMPLATES_WRITE]}
                        fallback={
                          <div className="text-center py-3">
                            <p className="text-xs text-muted-foreground">
                              Installation requires write permissions
                            </p>
                          </div>
                        }
                      >
                        <Button
                          onClick={() => onInstall(t.id)}
                          className="w-full gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Install Template
                        </Button>
                      </ClientPermissionGuard>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <TemplateInstallDialog
        open={installOpen}
        onOpenChange={setInstallOpen}
        organizationId={organizationId}
        templatePackageId={selectedTemplateId ?? undefined}
      />
    </ClientPermissionGuard>
  );
}
