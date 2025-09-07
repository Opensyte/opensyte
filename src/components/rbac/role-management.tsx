// TODO: Rename the functions components and file names to something related to team management
"use client";

import { useState } from "react";
import type { UserRole } from "@prisma/client";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { MoreHorizontal, Users, Shield, Info } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { CustomRoleWithPermissions } from "~/types/custom-roles";
import { RoleBadge } from "./role-badge";
import { ChangeRoleDialog } from "./change-role-dialog";
import { RemoveMemberDialog } from "./remove-member-dialog";
import { CustomRoleManagement } from "./custom-role-management";
import { ROLE_INFO, ROLE_PERMISSIONS } from "~/lib/rbac";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";

interface RoleManagementProps {
  organizationId: string;
}

type OrganizationMember = {
  id: string;
  userId: string;
  role: UserRole | null;
  customRoleId: string | null;
  customRole?: CustomRoleWithPermissions | null;
  roleInfo: (typeof ROLE_INFO)[UserRole] | null;
  joinedAt: Date;
  canEdit: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export function RoleManagement({ organizationId }: RoleManagementProps) {
  const [selectedMember, setSelectedMember] =
    useState<OrganizationMember | null>(null);
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  // Get current user session
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ?? "";

  // Get current user's permissions
  const { data: userPermissions } = api.rbac.getUserPermissions.useQuery(
    {
      userId: currentUserId,
      organizationId,
    },
    { enabled: !!currentUserId }
  );

  // Get organization members
  const { data: members, isLoading } = api.rbac.getOrganizationMembers.useQuery(
    {
      userId: currentUserId,
      organizationId,
    },
    { enabled: !!currentUserId }
  );

  const handleChangeRole = (member: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    role: UserRole | null;
    customRoleId?: string | null;
    customRole?: CustomRoleWithPermissions | null;
  }) => {
    // Convert to expected format for the dialog
    const convertedMember = {
      userId: member.userId,
      user: member.user,
      role: member.role,
      customRoleId: member.customRoleId ?? null,
      customRole: member.customRole ?? null,
    };
    setSelectedMember(convertedMember as OrganizationMember);
    setShowChangeRoleDialog(true);
  };

  const handleRemoveMember = (member: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    role: UserRole | null;
    customRoleId?: string | null;
    customRole?: CustomRoleWithPermissions | null;
  }) => {
    // Convert to expected format for the dialog
    const convertedMember = {
      userId: member.userId,
      user: member.user,
      role: member.role,
      customRoleId: member.customRoleId ?? null,
      customRole: member.customRole ?? null,
    };
    setSelectedMember(convertedMember as OrganizationMember);
    setShowRemoveMemberDialog(true);
  };

  const getRoleBadge = (member: {
    role: UserRole | null;
    customRoleId?: string | null;
    customRole?: CustomRoleWithPermissions | null;
  }) => {
    if (member.customRoleId && member.customRole?.name) {
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: member.customRole.color ?? "#3b82f6" }}
          />
          <Badge variant="secondary" className="text-xs">
            {member.customRole.name}
          </Badge>
        </div>
      );
    } else if (member.role) {
      return <RoleBadge role={member.role} />;
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          No Role
        </Badge>
      );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const currentUserRole = userPermissions?.role;

  // Find current user's organization membership from members data
  const currentUserOrgMember = members?.find(
    member => member.userId === currentUserId
  );

  // Create ExtendedUserOrganization object for CustomRoleManagement
  const currentUserOrg = currentUserOrgMember
    ? {
        userId: currentUserOrgMember.userId,
        organizationId: organizationId,
        role: currentUserOrgMember.role,
        customRoleId: currentUserOrgMember.customRoleId,
        joinedAt: currentUserOrgMember.joinedAt,
        customRole: currentUserOrgMember.customRole,
      }
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Team Management</h1>
            <p className="text-muted-foreground">
              Manage roles and permissions for your organization
            </p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team Management</h1>
          <p className="text-muted-foreground">
            Manage roles and permissions for your organization
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRoleInfo(!showRoleInfo)}
            className="w-full sm:w-auto"
          >
            <Info className="mr-2 h-4 w-4" />
            {showRoleInfo ? "Hide" : "View"} Role Guide
          </Button>
        </div>
      </div>

      {showRoleInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Guide
            </CardTitle>
            <CardDescription>
              Understanding the different roles and their permissions in your
              organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(
                Object.entries(ROLE_INFO).reduce(
                  (acc, [role, info]) => {
                    if (!acc[info.category]) {
                      acc[info.category] = [];
                    }
                    acc[info.category]!.push([role, info]);
                    return acc;
                  },
                  {} as Record<
                    string,
                    Array<[string, (typeof ROLE_INFO)[UserRole]]>
                  >
                )
              ).map(([category, roles]) => (
                <div key={category}>
                  <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                    {category} Roles
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roles.map(([role, info]) => (
                      <div key={role} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <RoleBadge role={role as UserRole} />
                          <span className="text-xs text-muted-foreground">
                            {ROLE_PERMISSIONS[role as UserRole]?.length ?? 0}{" "}
                            permissions
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({members?.length ?? 0})
          </CardTitle>
          <CardDescription>
            Manage roles and permissions for your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map(member => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.image ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {member.user.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.canEdit && currentUserRole && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleChangeRole(member as OrganizationMember)
                              }
                            >
                              Change Role
                            </DropdownMenuItem>
                            {member.userId !== currentUserId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRemoveMember(
                                      member as OrganizationMember
                                    )
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove Member
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Custom Roles Management */}
      {currentUserOrg && (
        <CustomRoleManagement
          organizationId={organizationId}
          userId={currentUserId}
          userOrg={currentUserOrg}
        />
      )}

      {selectedMember && currentUserRole && (
        <ChangeRoleDialog
          open={showChangeRoleDialog}
          onOpenChange={setShowChangeRoleDialog}
          member={selectedMember}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          organizationId={organizationId}
        />
      )}

      {selectedMember && (
        <RemoveMemberDialog
          open={showRemoveMemberDialog}
          onOpenChange={setShowRemoveMemberDialog}
          member={{
            userId: selectedMember.userId,
            user: {
              name: selectedMember.user.name,
              email: selectedMember.user.email,
            },
            role: selectedMember.role,
            customRole: selectedMember.customRole,
          }}
          currentUserId={currentUserId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
