"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Mail, Copy, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function EarlyAccessUserList() {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const {
    data: earlyAccessCodes,
    isLoading,
    refetch,
  } = api.admin.getEarlyAccessCodes.useQuery();

  const resendInvitationMutation = api.admin.resendInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent successfully");
      setResendingId(null);
    },
    onError: error => {
      toast.error(error.message);
      setResendingId(null);
    },
  });

  const revokeEarlyAccessMutation = api.admin.revokeEarlyAccess.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setRevokingId(null);
      void refetch(); // Refresh the list
    },
    onError: error => {
      toast.error(error.message);
      setRevokingId(null);
    },
  });

  const handleResendInvitation = async (id: string) => {
    setResendingId(id);
    try {
      await resendInvitationMutation.mutateAsync({ id });
    } catch {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleRevokeAccess = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeEarlyAccessMutation.mutateAsync({ id });
    } catch {
      // Error is handled by the mutation's onError callback
    }
  };

  const handleCopyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    toast.success("Registration code copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!earlyAccessCodes || earlyAccessCodes.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No early access users yet</h3>
        <p className="text-muted-foreground">
          Add your first early access user to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {earlyAccessCodes.length} total invitation
          {earlyAccessCodes.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Registration Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="hidden md:table-cell">Used At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {earlyAccessCodes.map(code => (
              <TableRow key={code.id}>
                <TableCell className="font-medium">{code.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                      {code.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(code.code)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={code.isUsed ? "default" : "secondary"}
                    className={
                      code.isUsed
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                    }
                  >
                    {code.isUsed ? "Used" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(code.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {code.usedAt
                    ? formatDistanceToNow(new Date(code.usedAt), {
                        addSuffix: true,
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!code.isUsed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(code.id)}
                        disabled={resendingId === code.id}
                        className="gap-2"
                      >
                        {resendingId === code.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Mail className="h-3 w-3" />
                        )}
                        <span className="hidden sm:inline">Resend</span>
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={revokingId === code.id}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          {revokingId === code.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">Revoke</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Revoke Early Access
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke early access for{" "}
                            <strong>{code.email}</strong>? This action cannot be
                            undone.
                            {code.isUsed && (
                              <span className="block mt-2 text-amber-600">
                                ⚠️ This user has already used their registration
                                code and will lose access to the platform.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevokeAccess(code.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
