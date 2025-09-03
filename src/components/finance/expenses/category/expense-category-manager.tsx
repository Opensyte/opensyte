"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronDown,
  Tags,
  Search,
} from "lucide-react";
import { ExpenseCategoryDialog } from "./expense-create-category-dialog";
import { ExpenseEditCategoryDialog } from "./expense-edit-category-dialog";
import { toast } from "sonner";

interface ExpenseCategoryManagerProps {
  organizationId: string;
  canWrite: boolean;
}

export function ExpenseCategoryManager({
  organizationId,
  canWrite,
}: ExpenseCategoryManagerProps) {
  const utils = api.useUtils();
  const { data: categories = [], isLoading } =
    api.expenseCategories.list.useQuery({ organizationId });

  const deleteMutation = api.expenseCategories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      void utils.expenseCategories.list.invalidate();
      setDeleteDialogOpen(false);
    },
    onError: e => toast.error(e.message ?? "Failed to delete category"),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");

  const filtered = categories.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  const handleDeleteClick = (category: { id: string; name: string }) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate({ id: categoryToDelete.id, organizationId });
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-dashed border-2 transition-colors hover:border-primary/50">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Tags className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      Expense Categories
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage and organize your expense categories
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {categories.length}{" "}
                    {categories.length === 1 ? "category" : "categories"}
                  </Badge>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-6">
              {/* Controls Row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {filtered.length} of {categories.length} shown
                  </div>
                  {canWrite && (
                    <Button onClick={() => setOpenCreate(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  )}
                </div>
              </div>

              {/* Categories Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No categories found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {search
                      ? "Try adjusting your search terms"
                      : "Get started by creating your first expense category"}
                  </p>
                  {canWrite && !search && (
                    <Button onClick={() => setOpenCreate(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Category
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map(category => (
                    <div
                      key={category.id}
                      className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="font-medium leading-none truncate">
                              {category.name}
                            </h4>
                            {category.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {category.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`${category.color} text-xs px-2 py-1 shrink-0`}
                          >
                            Tag
                          </Badge>
                        </div>

                        {canWrite && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs"
                              onClick={() => setEditingCategory(category.id)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() =>
                                handleDeleteClick({
                                  id: category.id,
                                  name: category.name,
                                })
                              }
                              disabled={deleteMutation.status === "pending"}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create Category Dialog */}
      <ExpenseCategoryDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        organizationId={organizationId}
        onCreated={() => {
          void utils.expenseCategories.list.invalidate();
          setOpenCreate(false);
        }}
      />

      {/* Edit Category Dialog */}
      <ExpenseEditCategoryDialog
        open={!!editingCategory}
        onOpenChange={open => {
          if (!open) {
            setEditingCategory(null);
          }
        }}
        organizationId={organizationId}
        categoryId={editingCategory ?? undefined}
        onUpdated={() => {
          void utils.expenseCategories.list.invalidate();
          setEditingCategory(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{categoryToDelete?.name}
              &quot;? This action cannot be undone. Existing expenses using this
              category will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.status === "pending"}
            >
              {deleteMutation.status === "pending" ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
