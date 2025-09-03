"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { Loader2, Tag, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ExpenseEditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  categoryId?: string;
  onUpdated?: () => void;
}

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

export function ExpenseEditCategoryDialog({
  open,
  onOpenChange,
  organizationId,
  categoryId,
  onUpdated,
}: ExpenseEditCategoryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch category data
  const { data: category, isLoading: isLoadingCategory } =
    api.expenseCategories.list.useQuery(
      { organizationId },
      {
        enabled: !!categoryId && open,
        select: data => data.find(cat => cat.id === categoryId),
      }
    );

  const updateMutation = api.expenseCategories.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      handleClose();
      onUpdated?.();
    },
    onError: error => {
      toast.error(error.message ?? "Failed to update category");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Populate form when category data is loaded
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description ?? "",
      });
    }
  }, [category, form]);

  const onSubmit = async (data: CategoryFormData) => {
    if (!categoryId) return;

    setIsSubmitting(true);
    updateMutation.mutate({
      id: categoryId,
      organizationId,
      name: data.name,
      description: data.description ?? undefined,
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  if (isLoadingCategory) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading category details...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!category && categoryId) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Category Not Found</h3>
              <p className="text-sm text-muted-foreground">
                The category you&apos;re trying to edit could not be found.
              </p>
            </div>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Edit Category
              </DialogTitle>
              <DialogDescription className="mt-1">
                Update the expense category details and information.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Category Information */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <Tag className="h-4 w-4" />
                  Category Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Category Name *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="e.g., Travel, Meals, Office Supplies"
                            className="pl-9 h-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Description
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            placeholder="Optional description for this category"
                            rows={3}
                            className="pl-9 resize-none"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Provide additional context about when to use this
                        category.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Current Category Preview */}
            {category && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-medium">
                    Current Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      {category.name}
                    </Badge>
                    {category.description && (
                      <span className="text-sm text-muted-foreground">
                        {category.description}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Footer Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>All fields marked with * are required</span>
              </div>
              <div className="flex gap-3 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Category
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
