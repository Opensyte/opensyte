"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  PermissionButton,
  WithPermissions,
} from "~/components/shared/permission-button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { MoreHorizontal, Edit, Trash2, Send, Shield } from "lucide-react";
import { InvoiceCreateDialog } from "./invoice-create-dialog";
import { InvoiceEditDialog } from "./invoice-edit-dialog";
import { InvoiceDeleteDialog } from "./invoice-delete-dialog";
import { InvoiceTableSkeleton } from "./invoice-skeletons";
import { invoiceStatusColors, invoiceStatusLabels } from "~/types";
import type { InvoiceClientProps } from "~/types";
import { toast } from "sonner";
import { usePermissions } from "~/hooks/use-permissions";
import { authClient } from "~/lib/auth-client";
import { Card, CardContent } from "~/components/ui/card";

export function InvoiceClient({ organizationId }: InvoiceClientProps) {
  // Authentication and permissions
  const { data: session } = authClient.useSession();
  const permissions = usePermissions({
    userId: session?.user.id ?? "",
    organizationId,
  });

  function formatAmount(value: unknown): string {
    if (typeof value === "number") return value.toFixed(2);
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "toString" in value) {
      try {
        const s = (value as { toString(): string }).toString();
        return s;
      } catch {
        return "0.00";
      }
    }
    return "0.00";
  }
  function formatDate(value: unknown): string {
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleDateString();
    }
    return "";
  }
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);
  const utils = api.useUtils();
  const { data: invoices = [], isLoading } = api.invoice.listInvoices.useQuery({
    organizationId,
    search: search || undefined,
  });

  const sendMutation = api.invoice.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice emailed");
      void utils.invoice.listInvoices.invalidate();
    },
    onError: e => toast.error(e.message ?? "Send failed"),
  });

  const handleSendEmail = (invoiceId: string, customerEmail: string | null) => {
    if (!customerEmail) {
      toast.error("Cannot send email: Customer has no email address");
      return;
    }
    sendMutation.mutate({ id: invoiceId, organizationId });
  };

  // Permission check
  if (!permissions.canReadFinance && !permissions.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Invoices</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Access Restricted</p>
              <p className="text-muted-foreground">
                You don&apos;t have permission to view invoicing data. Please
                contact your administrator to request access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search invoices"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full sm:w-64"
          />
          <PermissionButton
            userId={session?.user.id ?? ""}
            organizationId={organizationId}
            requiredPermission="write"
            module="finance"
            onClick={() => setOpenCreate(true)}
            className="w-full sm:w-auto"
          >
            New Invoice
          </PermissionButton>
        </div>
      </div>
      {isLoading ? (
        <InvoiceTableSkeleton />
      ) : invoices.length === 0 ? (
        <div className="rounded-md border p-12 text-center text-sm text-muted-foreground">
          No invoices yet.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell>{inv.customerName ?? inv.customerEmail}</TableCell>
                  <TableCell>{formatDate(inv.issueDate)}</TableCell>
                  <TableCell>{formatDate(inv.dueDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={invoiceStatusColors[inv.status]}
                    >
                      {invoiceStatusLabels[inv.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(inv.totalAmount)} {inv.currency}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleSendEmail(inv.id, inv.customerEmail)
                        }
                        disabled={
                          sendMutation.status === "pending" ||
                          !inv.customerEmail
                        }
                        title={
                          !inv.customerEmail
                            ? "Customer has no email address"
                            : "Send invoice by email"
                        }
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {sendMutation.status === "pending"
                          ? "Sending..."
                          : !inv.customerEmail
                            ? "No Email"
                            : "Send Email"}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <WithPermissions
                            userId={session?.user.id ?? ""}
                            organizationId={organizationId}
                            requiredPermission="write"
                            module="finance"
                          >
                            <DropdownMenuItem
                              onClick={() => setEditingInvoice(inv.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          </WithPermissions>
                          <WithPermissions
                            userId={session?.user.id ?? ""}
                            organizationId={organizationId}
                            requiredPermission="write"
                            module="finance"
                          >
                            <DropdownMenuItem
                              onClick={() => setDeletingInvoice(inv.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </WithPermissions>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <InvoiceCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        organizationId={organizationId}
        onCreated={() => void utils.invoice.listInvoices.invalidate()}
      />

      {editingInvoice && (
        <InvoiceEditDialog
          open={!!editingInvoice}
          onOpenChange={(open: boolean) => !open && setEditingInvoice(null)}
          organizationId={organizationId}
          invoiceId={editingInvoice}
          onUpdated={() => void utils.invoice.listInvoices.invalidate()}
        />
      )}

      {deletingInvoice && (
        <InvoiceDeleteDialog
          open={!!deletingInvoice}
          onOpenChange={(open: boolean) => !open && setDeletingInvoice(null)}
          organizationId={organizationId}
          invoiceId={deletingInvoice}
          onDeleted={() => void utils.invoice.listInvoices.invalidate()}
        />
      )}
    </div>
  );
}
