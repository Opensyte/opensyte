"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  Shield,
  Plus,
  Eye,
  Download,
  CreditCard,
  BellRing,
  CheckCircle2,
  Link2,
  ArrowUpDown,
  FileText,
  Settings,
} from "lucide-react";
import { api } from "~/trpc/react";
import { authClient } from "~/lib/auth-client";
import { usePermissions } from "~/hooks/use-permissions";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  PermissionButton,
  WithPermissions,
} from "~/components/shared/permission-button";
import { InvoiceTableSkeleton } from "./invoice-skeletons";
import { InvoiceDeleteDialog } from "./invoice-delete-dialog";
import { InvoicePaymentDialog } from "./invoice-payment-dialog";
import { invoiceStatusColors, invoiceStatusLabels } from "~/types";
import type { InvoiceClientProps } from "~/types";
import { formatCurrency, formatDate } from "~/lib/invoice/format";

type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "CANCELLED";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "VIEWED", label: "Viewed" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

type SortKey = "number" | "customer" | "issue" | "due" | "total";

export function InvoiceClient({ organizationId }: InvoiceClientProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const permissions = usePermissions({
    userId: session?.user.id ?? "",
    organizationId,
  });
  const utils = api.useUtils();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "issue",
    dir: "desc",
  });
  const [paymentTarget, setPaymentTarget] = useState<{
    id: string;
    currency: string;
    balance: number;
  } | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = api.invoice.listInvoices.useQuery({
    organizationId,
    search: search || undefined,
    status: statusTab === "ALL" ? undefined : statusTab,
  });
  const { data: summary = [] } = api.invoice.getInvoiceSummary.useQuery({
    organizationId,
  });

  const sendMutation = api.invoice.sendInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice emailed to the client");
      void utils.invoice.listInvoices.invalidate();
    },
    onError: e => toast.error(e.message ?? "Send failed"),
  });
  const reminderMutation = api.invoice.sendReminder.useMutation({
    onSuccess: () => toast.success("Reminder sent"),
    onError: e => toast.error(e.message ?? "Reminder failed"),
  });
  const payMutation = api.invoice.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Marked as paid");
      void utils.invoice.listInvoices.invalidate();
      void utils.invoice.getInvoiceSummary.invalidate({ organizationId });
    },
    onError: e => toast.error(e.message ?? "Failed"),
  });

  const sortedInvoices = useMemo(() => {
    const rows = [...invoices];
    const factor = sort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      switch (sort.key) {
        case "number":
          return a.invoiceNumber.localeCompare(b.invoiceNumber) * factor;
        case "customer":
          return (
            (a.customerName ?? a.customerEmail).localeCompare(
              b.customerName ?? b.customerEmail
            ) * factor
          );
        case "issue":
          return (
            (new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()) *
            factor
          );
        case "due":
          return (
            (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) *
            factor
          );
        case "total":
          return (Number(a.totalAmount) - Number(b.totalAmount)) * factor;
        default:
          return 0;
      }
    });
    return rows;
  }, [invoices, sort]);

  const toggleSort = (key: SortKey) =>
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  const copyLink = async (token: string | null) => {
    if (!token) {
      toast.error("This invoice has no share link yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invoice/${token}`
      );
      toast.success("Public link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  // Permission gate
  if (!permissions.canReadFinance && !permissions.isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">Access Restricted</p>
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            Create, send, and track client invoices
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/${organizationId}/settings/invoicing`)}
            className="w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <PermissionButton
            userId={session?.user.id ?? ""}
            organizationId={organizationId}
            requiredPermission="write"
            module="finance"
            onClick={() => router.push(`/${organizationId}/finance/invoices/new`)}
            className="w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </PermissionButton>
        </div>
      </div>

      {/* Summary strip (grouped by currency) */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary.map(s => (
            <Card key={s.currency}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.currency}
                  </span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat
                    label="Outstanding"
                    value={formatCurrency(s.outstanding, s.currency)}
                  />
                  <Stat
                    label="Paid (mo.)"
                    value={formatCurrency(s.paidThisMonth, s.currency)}
                    tone="positive"
                  />
                  <Stat
                    label="Overdue"
                    value={formatCurrency(s.overdue, s.currency)}
                    tone={Number(s.overdue) > 0 ? "negative" : undefined}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={statusTab} onValueChange={v => setStatusTab(v as StatusFilter)}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 lg:w-auto">
            {STATUS_TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search number, customer, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 w-full lg:w-72"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <InvoiceTableSkeleton />
      ) : sortedInvoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No invoices found</p>
              <p className="text-sm text-muted-foreground">
                {search || statusTab !== "ALL"
                  ? "Try adjusting your filters."
                  : "Create your first invoice to get started."}
              </p>
            </div>
            <WithPermissions
              userId={session?.user.id ?? ""}
              organizationId={organizationId}
              requiredPermission="write"
              module="finance"
            >
              <Button
                onClick={() =>
                  router.push(`/${organizationId}/finance/invoices/new`)
                }
              >
                <Plus className="mr-2 h-4 w-4" /> New Invoice
              </Button>
            </WithPermissions>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <div className="max-h-[65vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-card">
                  <SortableHead label="Number" onClick={() => toggleSort("number")} />
                  <SortableHead label="Customer" onClick={() => toggleSort("customer")} />
                  <SortableHead label="Issue" onClick={() => toggleSort("issue")} />
                  <SortableHead label="Due" onClick={() => toggleSort("due")} />
                  <TableHead>Status</TableHead>
                  <SortableHead
                    label="Total"
                    onClick={() => toggleSort("total")}
                    align="right"
                  />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvoices.map(inv => {
                  const total = Number(inv.totalAmount);
                  const paid = Number(inv.paidAmount);
                  const balance = Math.max(total - paid, 0);
                  const canPay =
                    balance > 0.0001 && inv.status !== "CANCELLED";
                  return (
                    <TableRow key={inv.id} className="group">
                      <TableCell className="font-mono text-sm">
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {inv.customerName ?? inv.customerEmail}
                        </div>
                        {inv.customerName && (
                          <div className="text-xs text-muted-foreground">
                            {inv.customerEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(inv.issueDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={invoiceStatusColors[inv.status]}
                        >
                          {invoiceStatusLabels[inv.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">
                        {formatCurrency(total, inv.currency)}
                        {paid > 0 && balance > 0 && (
                          <div className="text-xs font-normal text-muted-foreground">
                            {formatCurrency(balance, inv.currency)} due
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              disabled={!inv.publicToken}
                              onClick={() =>
                                inv.publicToken &&
                                window.open(`/invoice/${inv.publicToken}`, "_blank")
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!inv.publicToken}
                              onClick={() =>
                                inv.publicToken &&
                                window.open(
                                  `/api/invoices/${inv.publicToken}/pdf?download=1`,
                                  "_blank"
                                )
                              }
                            >
                              <Download className="mr-2 h-4 w-4" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyLink(inv.publicToken)}>
                              <Link2 className="mr-2 h-4 w-4" /> Copy link
                            </DropdownMenuItem>

                            <WithPermissions
                              userId={session?.user.id ?? ""}
                              organizationId={organizationId}
                              requiredPermission="write"
                              module="finance"
                            >
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/${organizationId}/finance/invoices/${inv.id}/edit`
                                  )
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  sendMutation.isPending || !inv.customerEmail
                                }
                                onClick={() =>
                                  sendMutation.mutate({
                                    id: inv.id,
                                    organizationId,
                                  })
                                }
                              >
                                <Send className="mr-2 h-4 w-4" /> Send email
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  reminderMutation.isPending || !inv.customerEmail
                                }
                                onClick={() =>
                                  reminderMutation.mutate({
                                    id: inv.id,
                                    organizationId,
                                  })
                                }
                              >
                                <BellRing className="mr-2 h-4 w-4" /> Send reminder
                              </DropdownMenuItem>
                              {canPay && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setPaymentTarget({
                                      id: inv.id,
                                      currency: inv.currency,
                                      balance,
                                    })
                                  }
                                >
                                  <CreditCard className="mr-2 h-4 w-4" /> Record
                                  payment
                                </DropdownMenuItem>
                              )}
                              {canPay && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    payMutation.mutate({
                                      id: inv.id,
                                      organizationId,
                                      amount: balance,
                                      method: "OTHER",
                                      paymentDate: new Date(),
                                    })
                                  }
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as
                                  paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingInvoice(inv.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </WithPermissions>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {paymentTarget && (
        <InvoicePaymentDialog
          open={!!paymentTarget}
          onOpenChange={open => !open && setPaymentTarget(null)}
          organizationId={organizationId}
          invoiceId={paymentTarget.id}
          currency={paymentTarget.currency}
          balanceDue={paymentTarget.balance}
          onRecorded={() => {
            void utils.invoice.listInvoices.invalidate();
            void utils.invoice.getInvoiceSummary.invalidate({ organizationId });
          }}
        />
      )}

      {deletingInvoice && (
        <InvoiceDeleteDialog
          open={!!deletingInvoice}
          onOpenChange={open => !open && setDeletingInvoice(null)}
          organizationId={organizationId}
          invoiceId={deletingInvoice}
          onDeleted={() => {
            void utils.invoice.listInvoices.invalidate();
            void utils.invoice.getInvoiceSummary.invalidate({ organizationId });
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "truncate text-sm font-semibold " +
          (tone === "positive"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "negative"
              ? "text-destructive"
              : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

function SortableHead({
  label,
  onClick,
  align,
}: {
  label: string;
  onClick: () => void;
  align?: "right";
}) {
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={onClick}
        className={
          "inline-flex items-center gap-1 hover:text-foreground " +
          (align === "right" ? "flex-row-reverse" : "")
        }
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      </button>
    </TableHead>
  );
}
