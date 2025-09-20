"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import {
  Package,
  Download,
  Shield,
  Clock,
  Users,
  Building,
  Workflow,
  BarChart3,
  FileText,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
  Calendar,
  Hash,
  Star,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface SharedTemplateViewProps {
  token: string;
}

export function SharedTemplateView({ token }: SharedTemplateViewProps) {
  const router = useRouter();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");

  // Get current session
  const { data: session } = authClient.useSession();

  // Get user's organizations for import selection
  const { data: userOrganizations, isLoading: isLoadingOrgs } =
    api.organization.getAll.useQuery(
      { userId: session?.user?.id ?? "" },
      {
        enabled: !!session?.user?.id && showImportDialog,
      }
    );

  const {
    data: shareData,
    isLoading,
    error,
  } = api.templateSharing.getShareByToken.useQuery(
    { token },
    {
      retry: false,
    }
  );

  const importMutation = api.templateSharing.importShare.useMutation({
    onSuccess: data => {
      toast.success(`Template "${data.name}" imported successfully!`);
      setShowImportDialog(false);
      // Redirect to the imported template
      router.push(
        `/${selectedOrganization}/templates/${data.templatePackageId}`
      );
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const handleImport = () => {
    if (!session?.user?.id) {
      toast.error("Please sign in to import templates");
      return;
    }

    if (!selectedOrganization) {
      toast.error("Please select an organization first");
      return;
    }

    importMutation.mutate({
      token,
      targetOrganizationId: selectedOrganization,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">
            Loading shared template...
          </p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Template Not Found</CardTitle>
            <CardDescription>
              This shared template link is invalid, expired, or has been
              revoked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { share, status, preview } = shareData;
  const canImport = status.canImport;

  const getStatusIcon = () => {
    switch (status.status) {
      case "ACTIVE":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "EXPIRED":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "REVOKED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "EXHAUSTED":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "EXPIRED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "REVOKED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "EXHAUSTED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
            <Package className="h-10 w-10" />
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-center">
            {share.templatePackage.name}
          </h1>
          {share.templatePackage.description && (
            <div
              className="text-xl text-muted-foreground [&>*]:text-muted-foreground [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-foreground [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-foreground [&>h3]:text-lg [&>h3]:font-medium [&>h3]:text-foreground [&>p]:mb-4 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>li]:mb-2 [&>strong]:font-semibold [&>strong]:text-foreground [&>b]:font-semibold [&>b]:text-foreground [&>em]:italic [&>i]:italic [&>a]:text-blue-600 [&>a]:hover:text-blue-800 [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>code]:bg-gray-100 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:font-mono [&>pre]:bg-gray-100 [&>pre]:p-4 [&>pre]:rounded [&>pre]:overflow-x-auto [&>pre]:text-sm [&>pre]:font-mono"
              dangerouslySetInnerHTML={{
                __html: share.templatePackage.description,
              }}
            />
          )}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Shared by {share.organization.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(share.createdAt), "PPP")}
              </span>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <h3 className="font-semibold">Share Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor()}>{status.status}</Badge>
                {canImport && session?.user?.id && (
                  <Button
                    onClick={() => setShowImportDialog(true)}
                    size="lg"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Save to My Templates
                  </Button>
                )}
              </div>
            </div>

            {status.details && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {status.details.usageRemaining !== undefined && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {status.details.usageRemaining} imports remaining
                    </span>
                  </div>
                )}
                {status.details.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Expires{" "}
                      {format(new Date(status.details.expiresAt), "PPP")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {preview && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Template Overview */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Template Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Version
                      </label>
                      <div className="text-lg font-semibold">
                        {preview.packageInfo.version}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Category
                      </label>
                      <div className="text-lg font-semibold">
                        {preview.packageInfo.category ?? "General"}
                      </div>
                    </div>
                  </div>

                  {preview.packageInfo.tags &&
                    preview.packageInfo.tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Tags
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {preview.packageInfo.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Assets Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    What&apos;s Included
                  </CardTitle>
                  <CardDescription>
                    This template package contains{" "}
                    {preview.metadata.totalAssets} assets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {preview.metadata.assetCounts.workflows > 0 && (
                      <div className="flex items-center gap-3 rounded-lg border p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                          <Workflow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {preview.metadata.assetCounts.workflows}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Workflows
                          </div>
                        </div>
                      </div>
                    )}

                    {preview.metadata.assetCounts.reports > 0 && (
                      <div className="flex items-center gap-3 rounded-lg border p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                          <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {preview.metadata.assetCounts.reports}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Reports
                          </div>
                        </div>
                      </div>
                    )}

                    {preview.metadata.assetCounts.actionTemplates > 0 && (
                      <div className="flex items-center gap-3 rounded-lg border p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                          <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {preview.metadata.assetCounts.actionTemplates}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Action Templates
                          </div>
                        </div>
                      </div>
                    )}

                    {preview.metadata.assetCounts.roles > 0 && (
                      <div className="flex items-center gap-3 rounded-lg border p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                          <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {preview.metadata.assetCounts.roles}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Custom Roles
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Compatible Modules */}
              {preview.metadata.compatibleModules.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Compatible Modules
                    </CardTitle>
                    <CardDescription>
                      This template works with the following system modules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {preview.metadata.compatibleModules.map(module => (
                        <Badge
                          key={module}
                          variant="outline"
                          className="capitalize"
                        >
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Assets
                    </span>
                    <span className="font-semibold">
                      {preview.metadata.totalAssets}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Compatible Modules
                    </span>
                    <span className="font-semibold">
                      {preview.metadata.compatibleModules.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created
                    </span>
                    <span className="font-semibold">
                      {format(new Date(preview.capturedAt), "MMM yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Shared By
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    {preview.organizationInfo.logo ? (
                      <Image
                        src={preview.organizationInfo.logo}
                        alt={preview.organizationInfo.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <Building className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">
                        {preview.organizationInfo.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Organization
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Verified template package</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Secure sharing protocol</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Immutable snapshot</span>
                  </div>
                </CardContent>
              </Card>

              {/* Import CTA */}
              {canImport && session?.user?.id && (
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <CardContent className="p-6 text-center">
                    <Star className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                    <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
                      Ready to Import
                    </h3>
                    <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                      Add this template to your organization and start using it
                      immediately.
                    </p>
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      className="w-full"
                      size="lg"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Save Template
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Sign In CTA - Show when user is not authenticated but template is importable */}
              {canImport && !session?.user?.id && (
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-600" />
                    <h3 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">
                      Sign In Required
                    </h3>
                    <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
                      Sign in to save this template to your organization and
                      start using it.
                    </p>
                    <Button
                      onClick={() => router.push("/auth/signin")}
                      className="w-full"
                      size="lg"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Sign In to Import
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      <Dialog
        open={showImportDialog}
        onOpenChange={open => {
          setShowImportDialog(open);
          if (!open) {
            setSelectedOrganization(""); // Reset selection when dialog closes
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template Package</DialogTitle>
            <DialogDescription>
              Choose the organization where you want to import &quot;
              {share.templatePackage.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              This template will be added to your selected organization.
              You&apos;ll be able to customize and use it immediately.
            </p>

            <div className="space-y-3">
              <Label htmlFor="organization-select">Select Organization</Label>
              {session?.user?.id ? (
                isLoadingOrgs ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading organizations...
                    </span>
                  </div>
                ) : userOrganizations && userOrganizations.length > 0 ? (
                  <Select
                    value={selectedOrganization}
                    onValueChange={setSelectedOrganization}
                  >
                    <SelectTrigger id="organization-select">
                      <SelectValue placeholder="Choose an organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {userOrganizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          <div className="flex items-center gap-3">
                            {org.logo ? (
                              <Image
                                src={org.logo}
                                alt={org.name}
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                <Building className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{org.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {org.userRole?.toLowerCase().replace("_", " ")}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <Building className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      You don&apos;t belong to any organizations yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => router.push("/create-organization")}
                    >
                      Create Organization
                    </Button>
                  </div>
                )
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Please sign in to import this template.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push("/auth/signin")}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importMutation.isPending ||
                !selectedOrganization ||
                !session?.user?.id
              }
            >
              {importMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
