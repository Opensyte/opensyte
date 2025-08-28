"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Shield, Users, Settings, Info, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authClient } from "~/lib/auth-client";
import { api } from "~/trpc/react";
import { RoleBadge } from "~/components/rbac/role-badge";

export function SettingsClient() {
  const { data: session } = authClient.useSession();
  const params = useParams();
  const orgId = params?.orgId as string;

  // Get current user's permissions
  const { data: userPermissions } = api.rbac.getUserPermissions.useQuery(
    {
      userId: session?.user?.id ?? "",
      organizationId: orgId,
    },
    { enabled: !!session?.user?.id && !!orgId }
  );

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

  const settingsItems = [
    {
      title: "General",
      description: "Organization settings and preferences",
      icon: Settings,
      href: `/[orgId]/settings/general`,
      available: true,
    },
    {
      title: "Team & Roles",
      description: "Manage team members and their permissions",
      icon: Users,
      href: `/[orgId]/settings/team`,
      available: Boolean(userPermissions?.permissions.canManageMembers),
      badge: "RBAC",
    },
    {
      title: "Invitations",
      description: "Send and manage organization invitations",
      icon: Shield,
      href: `/[orgId]/settings/invitations`,
      available: Boolean(userPermissions?.permissions.canManageMembers),
    },
  ];

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization settings and preferences
          </p>
        </div>

        {/* Current User Role */}
        {userPermissions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Role & Permissions
              </CardTitle>
              <CardDescription>
                Your current role and access level in this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Current Role:</span>
                    {userPermissions.role ? (
                      <RoleBadge role={userPermissions.role} />
                    ) : (
                      <span className="text-muted-foreground">
                        No role assigned
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This role determines what you can see and do in this
                    organization.
                  </p>
                </div>
                <Link href={`/${orgId}/settings/team`} passHref>
                  <Button variant="outline" size="sm">
                    <Info className="mr-2 h-4 w-4" />
                    View Role Guide
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RBAC Info Card */}
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Shield className="h-5 w-5" />
              Role-Based Access Control (RBAC)
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                NEW
              </Badge>
            </CardTitle>
            <CardDescription className="text-blue-700">
              OpenSyte now includes comprehensive role-based access control
            </CardDescription>
          </CardHeader>
          <CardContent className="text-blue-900">
            <div className="space-y-4">
              <p className="text-sm">
                Our RBAC system provides business-aligned roles that reflect
                actual job functions, ensuring users only have access to the
                features they need.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-medium text-sm">Organization Roles</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Owner, Super Admin, Department Manager
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-medium text-sm">Departmental Roles</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    HR, Sales, Finance, Project Managers
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="font-medium text-sm">Standard Roles</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Employee, Contractor, Viewer
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-sm">
                  <span className="font-medium">Features:</span> Granular
                  permissions, hierarchical access, module-based security
                </div>
                <Link href={`/${orgId}/settings/team`} passHref>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Manage Roles
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Categories */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {settingsItems.map(item => {
            const Icon = item.icon;
            const href = item.href.replace("[orgId]", orgId);

            return (
              <Card
                key={item.title}
                className={`transition-colors ${
                  item.available
                    ? "hover:bg-muted/50 cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <Link
                  href={item.available ? href : "#"}
                  className="block"
                  onClick={e => !item.available && e.preventDefault()}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {item.title}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                        {item.available && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                    {!item.available && (
                      <p className="text-xs text-red-600 mt-2">
                        Insufficient permissions to access this section
                      </p>
                    )}
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
