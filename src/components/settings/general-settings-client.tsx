"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";
import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";
import { OrganizationInfoForm } from "./organization-info-form";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Building2,
  Trash2,
  Shield,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "~/components/ui/skeleton";

export function GeneralSettingsClient() {
  const { data: session } = authClient.useSession();
  const params = useParams();
  const router = useRouter();
  const orgId = params?.orgId as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get organization data
  const { data: organization, isLoading: orgLoading } =
    api.organization.getById.useQuery(
      {
        id: orgId,
        userId: session?.user?.id ?? "",
      },
      {
        enabled: !!session?.user?.id && !!orgId,
      }
    );

  // Get user permissions
  const { data: userPermissions } = api.rbac.getUserPermissions.useQuery(
    {
      userId: session?.user?.id ?? "",
      organizationId: orgId,
    },
    { enabled: !!session?.user?.id && !!orgId }
  );

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!session?.user?.id || !orgId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You need to be logged in to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientPermissionGuard
      requiredAnyPermissions={[
        PERMISSIONS.SETTINGS_READ,
        PERMISSIONS.SETTINGS_WRITE,
        PERMISSIONS.SETTINGS_ADMIN,
      ]}
    >
      <div className="space-y-6">
        {orgLoading ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : !organization ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Organization Not Found
                </h3>
                <p className="text-muted-foreground">
                  The organization could not be found or you don&apos;t have
                  access to it.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Organization Information Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Organization Information</CardTitle>
                    <CardDescription>
                      Update your organization details and settings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <OrganizationInfoForm
                  organization={organization}
                  canEdit={
                    userPermissions?.permissions.canWriteSettings ?? false
                  }
                />
              </CardContent>
            </Card>

            {/* Organization Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Read-only information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Organization ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Organization ID
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 text-sm bg-muted rounded-md font-mono">
                        {organization.id}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(organization.id, "Organization ID")
                        }
                      >
                        {copiedField === "Organization ID" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Member Count */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Team Members</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">
                        {organization.membersCount}{" "}
                        {organization.membersCount === 1 ? "member" : "members"}
                      </Badge>
                    </div>
                  </div>

                  {/* Creation Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(organization.createdAt)}
                    </p>
                  </div>

                  {/* Last Updated */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Updated</label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(organization.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone - Only show to Organization Owners */}
            {organization.userRole === "ORGANIZATION_OWNER" && (
              <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/20">
                      <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle className="text-red-900 dark:text-red-100">
                        Danger Zone
                      </CardTitle>
                      <CardDescription className="text-red-700 dark:text-red-300">
                        Irreversible and destructive actions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator className="bg-red-200 dark:bg-red-800" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium text-red-900 dark:text-red-100">
                        Delete Organization
                      </h3>
                      <p className="text-sm text-red-700 dark:text-red-300 max-w-md">
                        Permanently delete this organization and all associated
                        data. This action cannot be undone and will immediately
                        remove access for all team members.
                      </p>
                      <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                        <p>
                          • All projects, tasks, and customer data will be
                          deleted
                        </p>
                        <p>
                          • All invoices and financial records will be removed
                        </p>
                        <p>• Team members will lose access immediately</p>
                        <p>• This action cannot be reversed</p>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Organization
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Delete Organization Dialog */}
        <DeleteOrganizationDialog
          organization={organization}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={() => {
            toast.success("Organization deleted successfully");
            router.push("/");
          }}
        />
      </div>
    </ClientPermissionGuard>
  );
}
