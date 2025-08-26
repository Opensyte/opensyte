"use client";

import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { useState } from "react";
import { type UserRole } from "@prisma/client";
import { toast } from "sonner";
import {
  UserPlus,
  Mail,
  Clock,
  RefreshCw,
  Trash2,
  Send,
  Users,
} from "lucide-react";

function InvitationsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Invite form skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-10 w-full sm:max-w-sm" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Invitations table skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getRoleBadgeVariant(
  role: UserRole
): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "OWNER":
      return "default";
    case "ADMIN":
      return "secondary";
    case "MEMBER":
      return "outline";
    case "VIEWER":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "ACCEPTED":
      return "default";
    case "EXPIRED":
      return "destructive";
    case "REVOKED":
      return "destructive";
    default:
      return "outline";
  }
}

export function InvitationPageClient() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("MEMBER");

  const utils = api.useUtils();
  const { data: allInvitations, isLoading } = api.invitations.list.useQuery(
    { organizationId: orgId },
    { enabled: !!orgId }
  );

  // Filter out revoked invitations
  const data = allInvitations?.filter(inv => inv.status !== "REVOKED");

  const createMutation = api.invitations.create.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setEmail("");
      setRole("MEMBER");
      void utils.invitations.list.invalidate({ organizationId: orgId });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const resendMutation = api.invitations.resend.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent successfully");
      void utils.invitations.list.invalidate({ organizationId: orgId });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const revokeMutation = api.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked successfully");
      void utils.invitations.list.invalidate({ organizationId: orgId });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        <InvitationsSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Team Invitations</h1>
        <p className="text-muted-foreground">
          Invite team members to collaborate in your organization
        </p>
      </div>

      <Separator />

      {/* Invite form */}
      <Card className="border-dashed border-muted-foreground/25 bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Invite a teammate</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2 sm:w-[180px]">
              <label
                htmlFor="role"
                className="text-sm font-medium text-foreground"
              >
                Role
              </label>
              <Select value={role} onValueChange={v => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER" disabled>
                    Owner
                  </SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                createMutation.mutate({ organizationId: orgId, email, role })
              }
              disabled={!email || !orgId || createMutation.isPending}
              className="sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send invite
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitations list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Pending invitations</span>
            {data && data.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {data.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No pending invitations</h3>
              <p className="text-sm text-muted-foreground">
                Invite your first team member to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {inv.email.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{inv.email}</p>
                        <Badge
                          variant={getRoleBadgeVariant(inv.role)}
                          className="text-xs"
                        >
                          {inv.role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Sent {new Date(inv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Badge
                            variant={getStatusBadgeVariant(inv.status)}
                            className="text-xs"
                          >
                            {inv.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        resendMutation.mutate({
                          id: inv.id,
                          organizationId: orgId,
                        })
                      }
                      disabled={
                        resendMutation.isPending ||
                        inv.status === "ACCEPTED" ||
                        inv.status === "EXPIRED"
                      }
                    >
                      {resendMutation.isPending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        revokeMutation.mutate({
                          id: inv.id,
                          organizationId: orgId,
                        })
                      }
                      disabled={
                        revokeMutation.isPending || inv.status === "ACCEPTED"
                      }
                      className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      {revokeMutation.isPending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-1 h-3 w-3" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
