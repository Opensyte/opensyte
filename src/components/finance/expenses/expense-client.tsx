"use client";

import { useState, useMemo } from "react";
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
import { Card, CardContent } from "~/components/ui/card";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  DollarSign,
  Shield,
  Calendar,
  Receipt,
} from "lucide-react";
import { ExpenseCreateDialog } from "./dialogs/expense-create-dialog";
import { ExpenseEditDialog } from "./dialogs/expense-edit-dialog";
import { ExpenseDeleteDialog } from "./dialogs/expense-delete-dialog";
import { ExpenseFiltersDialog } from "./filters/expense-filters-dialog";
import { ExpenseTableSkeleton } from "./expense-skeletons";
import { ExpenseSummaryCards } from "./expense-summary-cards";
import {
  expenseStatusColors,
  expenseStatusLabels,
  paymentMethodLabels,
  type ExpenseFilters,
  type ExpenseClientProps,
} from "~/types/expenses";
import { toast } from "sonner";
import { usePermissions } from "~/hooks/use-permissions";
import { authClient } from "~/lib/auth-client";
import { ExpenseCategoryManager } from "./category/expense-category-manager";

export function ExpenseClient({ organizationId }: ExpenseClientProps) {
  // Authentication and permissions
  const { data: session } = authClient.useSession();
  const permissions = usePermissions({
    userId: session?.user.id ?? "",
    organizationId,
  });

  // State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [openCreate, setOpenCreate] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "amount" | "createdAt">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // API
  const utils = api.useUtils();
  const { data: expenseData, isLoading } = api.expense.list.useQuery({
    organizationId,
    filters: {
      ...filters,
      search: search || undefined,
    },
    pagination: { page, limit: 25 },
    sortBy,
    sortOrder,
  });

  const { data: summary } = api.expense.getSummary.useQuery({
    organizationId,
    filters,
  });

  // Helper functions
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

  const handleSort = (column: "date" | "amount" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleApplyFilters = (newFilters: ExpenseFilters) => {
    setFilters(newFilters);
    setPage(1);
    setOpenFilters(false);
  };

  // CSV Export functionality
  const csvHeaders = [
    { label: "Date", key: "date" },
    { label: "Description", key: "description" },
    { label: "Category", key: "category" },
    { label: "Vendor", key: "vendor" },
    { label: "Amount", key: "amount" },
    { label: "Currency", key: "currency" },
    { label: "Payment Method", key: "paymentMethod" },
    { label: "Status", key: "status" },
    { label: "Reimbursable", key: "reimbursable" },
    { label: "Project", key: "project" },
    { label: "Notes", key: "notes" },
  ];

  // Prepare CSV data
  const csvData = useMemo(() => {
    const expenseList = expenseData?.expenses ?? [];
    return expenseList.map(expense => ({
      date: formatDate(expense.date),
      description: expense.description ?? "",
      category:
        expense.category?.name ?? expense.customCategory ?? "Uncategorized",
      vendor: expense.vendor ?? "",
      amount: formatAmount(expense.amount),
      currency: expense.currency,
      paymentMethod: paymentMethodLabels[expense.paymentMethod],
      status: expenseStatusLabels[expense.status],
      reimbursable: expense.reimbursable ? "Yes" : "No",
      project: expense.project?.name ?? "",
      notes: expense.notes ?? "",
    }));
  }, [expenseData?.expenses]);

  // Generate CSV filename with current date
  const csvFilename = `expenses-${new Date().toISOString().split("T")[0]}.csv`;

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleExportCSV = () => {
    if (csvData.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    // If we have data, trigger the download
    const csvContent = [
      csvHeaders.map(h => h.label).join(","),
      ...csvData.map(row =>
        csvHeaders
          .map(h => {
            const value = row[h.key as keyof typeof row] ?? "";
            // Escape commas and quotes in CSV values
            return typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", csvFilename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${csvData.length} expenses to CSV`);
  };

  // Permission check
  if (!permissions.canReadFinance && !permissions.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Expenses</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Access Restricted</p>
              <p className="text-muted-foreground">
                You don&apos;t have permission to view expense data. Please
                contact your administrator to request access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expenses = expenseData?.expenses ?? [];
  const pagination = expenseData?.pagination;
  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Expenses</h2>
            <p className="text-sm text-muted-foreground">
              Track and manage business expenses
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <PermissionButton
              userId={session?.user.id ?? ""}
              organizationId={organizationId}
              requiredPermission="write"
              module="finance"
              onClick={() => setOpenCreate(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </PermissionButton>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
            <Input
              placeholder="Search expenses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-full sm:max-w-sm"
            />
            {hasFilters && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {Object.keys(filters).length} filter(s) active
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-2"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenFilters(true)}
              className="w-full sm:w-auto"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasFilters && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex justify-center items-center"
                >
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <ExpenseSummaryCards summary={summary} isLoading={!summary} />

      {/* Category Manager */}
      {permissions.canWriteFinance && (
        <ExpenseCategoryManager
          organizationId={organizationId}
          canWrite={permissions.canWriteFinance}
        />
      )}

      {/* Expenses Table */}
      {isLoading ? (
        <ExpenseTableSkeleton />
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No expenses found</h3>
                <p className="text-muted-foreground">
                  {hasFilters || search
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first expense"}
                </p>
              </div>
              {!hasFilters && !search && (
                <PermissionButton
                  userId={session?.user.id ?? ""}
                  organizationId={organizationId}
                  requiredPermission="write"
                  module="finance"
                  onClick={() => setOpenCreate(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Expense
                </PermissionButton>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-muted/20">
                      <TableHead
                        className="cursor-pointer select-none transition-colors hover:bg-muted/30 font-semibold"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Date</span>
                          {sortBy === "date" && (
                            <div className="flex items-center justify-center w-4 h-4 rounded-sm bg-primary/10">
                              <span className="text-xs text-primary font-medium">
                                {sortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          Description
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Payment</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead
                        className="text-right cursor-pointer select-none transition-colors hover:bg-muted/30 font-semibold"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <span>Amount</span>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {sortBy === "amount" && (
                            <div className="flex items-center justify-center w-4 h-4 rounded-sm bg-primary/10">
                              <span className="text-xs text-primary font-medium">
                                {sortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold w-20">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(expense => (
                      <TableRow
                        key={expense.id}
                        className="border-border/40 transition-colors hover:bg-muted/30 group"
                      >
                        <TableCell className="font-medium py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                              {formatDate(expense.date)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString(
                                "en-US",
                                { weekday: "short" }
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1 max-w-[200px]">
                            <p className="font-medium text-sm text-foreground truncate">
                              {expense.description ?? "No description"}
                            </p>
                            {expense.vendor && (
                              <div className="flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/50"></div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {expense.vendor}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {expense.category ? (
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-primary/20 font-medium"
                            >
                              {expense.category.name}
                            </Badge>
                          ) : expense.customCategory ? (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200 font-medium"
                            >
                              {expense.customCategory}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs px-2 py-1 bg-muted/50 rounded-md">
                              Uncategorized
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium">
                              {paymentMethodLabels[expense.paymentMethod]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`${expenseStatusColors[expense.status]} font-medium`}
                          >
                            {expenseStatusLabels[expense.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium py-4">
                          <div className="space-y-2">
                            <div className="text-right">
                              <span className="text-lg font-bold text-foreground">
                                {formatAmount(expense.amount)}
                              </span>
                              <span className="text-sm text-muted-foreground ml-1">
                                {expense.currency}
                              </span>
                            </div>
                            {expense.reimbursable && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 text-xs font-medium"
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                Reimbursable
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <WithPermissions
                                userId={session?.user.id ?? ""}
                                organizationId={organizationId}
                                requiredPermission="write"
                                module="finance"
                              >
                                <DropdownMenuItem
                                  onClick={() => setEditingExpense(expense.id)}
                                  className="cursor-pointer"
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
                                  onClick={() => setDeletingExpense(expense.id)}
                                  className="text-red-600 focus:text-red-600 cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </WithPermissions>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {expenses.map(expense => (
              <Card
                key={expense.id}
                className="p-4 border border-border/40 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  {/* Header with Date and Amount */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {formatDate(expense.date)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString("en-US", {
                          weekday: "long",
                        })}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">
                        {formatAmount(expense.amount)} {expense.currency}
                      </div>
                      {expense.reimbursable && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 text-xs mt-1"
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          Reimbursable
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Description and Vendor */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {expense.description ?? "No description"}
                      </span>
                    </div>
                    {expense.vendor && (
                      <div className="ml-6 text-xs text-muted-foreground">
                        Vendor: {expense.vendor}
                      </div>
                    )}
                  </div>

                  {/* Category, Payment Method, and Status */}
                  <div className="flex flex-wrap gap-2">
                    {expense.category ? (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {expense.category.name}
                      </Badge>
                    ) : expense.customCategory ? (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-700 border-orange-200"
                      >
                        {expense.customCategory}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground"
                      >
                        Uncategorized
                      </Badge>
                    )}

                    <Badge
                      variant="outline"
                      className={expenseStatusColors[expense.status]}
                    >
                      {expenseStatusLabels[expense.status]}
                    </Badge>

                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {paymentMethodLabels[expense.paymentMethod]}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-2 border-t border-border/40">
                    <div className="flex gap-2">
                      <WithPermissions
                        userId={session?.user.id ?? ""}
                        organizationId={organizationId}
                        requiredPermission="write"
                        module="finance"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingExpense(expense.id)}
                          className="h-8 px-3"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                      </WithPermissions>
                      <WithPermissions
                        userId={session?.user.id ?? ""}
                        organizationId={organizationId}
                        requiredPermission="write"
                        module="finance"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingExpense(expense.id)}
                          className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </WithPermissions>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Card className="mt-4">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.totalCount
              )}{" "}
              of {pagination.totalCount} expenses
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <ExpenseCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        organizationId={organizationId}
        onCreated={() => {
          void utils.expense.list.invalidate();
          void utils.expense.getSummary.invalidate();
        }}
      />

      <ExpenseFiltersDialog
        open={openFilters}
        onOpenChange={setOpenFilters}
        organizationId={organizationId}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />

      {editingExpense && (
        <ExpenseEditDialog
          open={!!editingExpense}
          onOpenChange={(open: boolean) => !open && setEditingExpense(null)}
          organizationId={organizationId}
          expenseId={editingExpense}
          onUpdated={() => {
            void utils.expense.list.invalidate();
            void utils.expense.getSummary.invalidate();
          }}
        />
      )}

      {deletingExpense && (
        <ExpenseDeleteDialog
          open={!!deletingExpense}
          onOpenChange={(open: boolean) => !open && setDeletingExpense(null)}
          organizationId={organizationId}
          expenseId={deletingExpense}
          onDeleted={() => {
            void utils.expense.list.invalidate();
            void utils.expense.getSummary.invalidate();
          }}
        />
      )}
    </div>
  );
}
