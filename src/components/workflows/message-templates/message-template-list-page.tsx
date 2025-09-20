"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  Mail,
  MessageSquare,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Lock,
} from "lucide-react";
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
import { toast } from "sonner";
import { SystemTemplateService } from "~/lib/system-templates";
import type { MessageChannel } from "~/types/message-templates";

interface MessageTemplateListPageProps {
  organizationId: string;
}

type FilterType = MessageChannel | "ALL";

interface TemplateWithVersion {
  version?: string | null;
}

function hasVersion(t: unknown): t is TemplateWithVersion {
  return (
    typeof t === "object" &&
    t !== null &&
    "version" in t &&
    (typeof (t as Record<string, unknown>).version === "string" ||
      (t as Record<string, unknown>).version === null)
  );
}

export function MessageTemplateListPage({
  organizationId,
}: MessageTemplateListPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Get action templates (both system and custom)
  const {
    data: actionTemplates,
    isLoading,
    refetch,
  } = api.workflows.actions.getActionTemplates.useQuery({
    organizationId,
    category: "COMMUNICATION", // Filter to communication templates only
  });

  // Delete mutation for custom templates
  const deleteMutation = api.workflows.actions.deleteActionTemplate.useMutation(
    {
      onSuccess: () => {
        toast.success("Template deleted successfully");
        closeDeleteDialog();
        void refetch();
      },
      onError: error => {
        toast.error(error.message);
        closeDeleteDialog();
      },
    }
  );

  // Filter templates based on search and type
  const filteredTemplates = useMemo(() => {
    if (!actionTemplates) return [];

    return actionTemplates.filter(template => {
      // Filter by type (EMAIL/SMS)
      if (typeFilter !== "ALL" && template.type !== typeFilter) {
        return false;
      }

      // Filter by search
      if (
        search &&
        !template.name.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      // Only show EMAIL and SMS templates
      return template.type === "EMAIL" || template.type === "SMS";
    });
  }, [actionTemplates, search, typeFilter]);

  const handleDelete = (templateId: string, templateName: string) => {
    setTemplateToDelete({ id: templateId, name: templateName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate({
        templateId: templateToDelete.id,
        organizationId,
      });
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "SMS":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // (Removed unused formatDate to satisfy lint)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Message Templates
          </h1>
          <p className="text-muted-foreground">
            Create and manage email and SMS templates for your workflows
          </p>
        </div>
        <Button
          onClick={() =>
            router.push(`/${organizationId}/workflows/message-templates/create`)
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={typeFilter}
            onValueChange={(value: FilterType) => setTypeFilter(value)}
          >
            <SelectTrigger className="w-32">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !filteredTemplates.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {search || typeFilter !== "ALL"
              ? "Try adjusting your filters or search terms."
              : "Get started by creating your first message template."}
          </p>
          {!search && typeFilter === "ALL" && (
            <Button
              className="mt-4"
              onClick={() =>
                router.push(
                  `/${organizationId}/workflows/message-templates/create`
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(template => {
              const isSystemTemplate = SystemTemplateService.isSystemTemplate(
                template.id
              );

              return (
                <Card
                  key={template.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(template.type)}
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {isSystemTemplate && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </CardTitle>
                      </div>
                      <div className="flex gap-1">
                        {isSystemTemplate ? (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Custom
                          </Badge>
                        )}
                        {template.isActive && (
                          <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Preview content */}
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {template.type === "EMAIL" &&
                          "Email template with rich content"}
                        {template.type === "SMS" &&
                          "SMS template for quick messages"}
                      </div>

                      {/* Variables */}
                      {((Array.isArray(template.requiredVariables) &&
                        template.requiredVariables.length > 0) ||
                        (Array.isArray(template.optionalVariables) &&
                          template.optionalVariables.length > 0)) && (
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(template.requiredVariables) &&
                            template.requiredVariables
                              .slice(0, 3)
                              .map((variable, index) => {
                                const value =
                                  typeof variable === "string"
                                    ? variable
                                    : JSON.stringify(variable);
                                return (
                                  <Badge
                                    key={`${value}-${index}`}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {value}
                                  </Badge>
                                );
                              })}
                          {(Array.isArray(template.requiredVariables)
                            ? template.requiredVariables.length
                            : 0) +
                            (Array.isArray(template.optionalVariables)
                              ? template.optionalVariables.length
                              : 0) >
                            3 && (
                            <Badge variant="outline" className="text-xs">
                              +
                              {(Array.isArray(template.requiredVariables)
                                ? template.requiredVariables.length
                                : 0) +
                                (Array.isArray(template.optionalVariables)
                                  ? template.optionalVariables.length
                                  : 0) -
                                3}{" "}
                              more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {isSystemTemplate
                          ? "System Template"
                          : `Version ${hasVersion(template) && template.version ? template.version : "1.0.0"}`}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/${organizationId}/workflows/message-templates/${template.id}`
                            )
                          }
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        {!isSystemTemplate && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/${organizationId}/workflows/message-templates/${template.id}/edit`
                                )
                              }
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDelete(template.id, template.name)
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the template &ldquo;
              {templateToDelete?.name}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
