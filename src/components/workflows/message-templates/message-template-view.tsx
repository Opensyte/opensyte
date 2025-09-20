"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Edit,
  Copy,
  Eye,
  Lock,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { MessageTemplatePreview } from "./message-template-preview";
import { SystemTemplateService } from "~/lib/system-templates";
import type { MessageChannel } from "~/types/message-templates";

interface TemplateContent {
  email?: {
    subject?: string | null;
    html?: string | null;
  } | null;
  sms?: {
    message?: string | null;
  } | null;
  requiredVariables?: string[] | null;
  optionalVariables?: string[] | null;
  [key: string]: unknown; // allow forward compatibility while keeping type safety
}

interface MessageTemplateViewProps {
  organizationId: string;
  templateId: string;
}

export function MessageTemplateView({
  organizationId,
  templateId,
}: MessageTemplateViewProps) {
  const router = useRouter();

  // Get template data
  const {
    data: template,
    isLoading,
    error,
  } = api.workflows.actions.getActionTemplate.useQuery({
    templateId,
    organizationId,
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() =>
            router.push(`/${organizationId}/workflows/message-templates`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-60 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !template) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() =>
            router.push(`/${organizationId}/workflows/message-templates`)
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Template Not Found
            </CardTitle>
            <CardDescription>
              The template you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                router.push(`/${organizationId}/workflows/message-templates`)
              }
            >
              Return to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSystemTemplate = SystemTemplateService.isSystemTemplate(template.id);
  const templateData: TemplateContent = (template.template ??
    {}) as TemplateContent;
  const templateType = template.type as MessageChannel;

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "EMAIL":
        return <Mail className="h-5 w-5" />;
      case "SMS":
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleCopyTemplate = () => {
    // TODO: Implement copy functionality
    toast.info("Copy functionality coming soon");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() =>
              router.push(`/${organizationId}/workflows/message-templates`)
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>

          <div className="flex items-center gap-3">
            {getChannelIcon(templateType)}
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                {template.name}
                {isSystemTemplate && (
                  <Lock className="h-6 w-6 text-muted-foreground" />
                )}
              </h1>
              <p className="text-muted-foreground">
                {template.description ??
                  `${templateType} template for workflows`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyTemplate}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Template
          </Button>
          {!isSystemTemplate && (
            <Button
              onClick={() =>
                router.push(
                  `/${organizationId}/workflows/message-templates/${template.id}/edit`
                )
              }
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Template
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Template Details */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
              <CardDescription>
                Basic details about this template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Type
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {getChannelIcon(templateType)}
                    <span className="font-medium">{templateType}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge
                      className={
                        template.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Version
                  </label>
                  <div className="mt-1 font-medium">
                    {template.version ?? "1.0.0"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Usage Count
                  </label>
                  <div className="mt-1 font-medium">
                    {template.usageCount ?? 0}
                  </div>
                </div>
              </div>

              {!isSystemTemplate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Created
                    </label>
                    <div className="mt-1 text-sm">
                      {formatDate(template.createdAt)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Updated
                    </label>
                    <div className="mt-1 text-sm">
                      {formatDate(template.updatedAt)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variables */}
          {((Array.isArray(template.requiredVariables) &&
            template.requiredVariables.length > 0) ||
            (Array.isArray(template.optionalVariables) &&
              template.optionalVariables.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Variables</CardTitle>
                <CardDescription>
                  Variables that can be used in this template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.requiredVariables &&
                  Array.isArray(template.requiredVariables) &&
                  template.requiredVariables.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Required Variables
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(template.requiredVariables as string[]).map(
                          variable => (
                            <Badge key={variable} className="text-xs">
                              {"{" + variable + "}"}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {template.optionalVariables &&
                  Array.isArray(template.optionalVariables) &&
                  template.optionalVariables.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Optional Variables
                      </label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(template.optionalVariables as string[]).map(
                          variable => (
                            <Badge
                              key={variable}
                              variant="outline"
                              className="text-xs"
                            >
                              {"{" + variable + "}"}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Raw Content */}
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
              <CardDescription>
                Raw template content for reference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateType === "EMAIL" && templateData?.email && (
                <>
                  {templateData.email.subject && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Subject
                      </label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <code className="text-sm">
                          {templateData.email.subject ?? ""}
                        </code>
                      </div>
                    </div>
                  )}
                  {templateData.email.html && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        HTML Content
                      </label>
                      <div className="mt-1 p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
                        <code className="text-sm whitespace-pre-wrap">
                          {templateData.email.html ?? ""}
                        </code>
                      </div>
                    </div>
                  )}
                </>
              )}

              {templateType === "SMS" && templateData?.sms && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Message
                  </label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <code className="text-sm whitespace-pre-wrap">
                      {templateData.sms.message ?? ""}
                    </code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                See how your template will look with sample data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessageTemplatePreview
                type={templateType}
                data={{
                  subject:
                    templateType === "EMAIL"
                      ? (templateData?.email?.subject ?? undefined)
                      : undefined,
                  html:
                    templateType === "EMAIL"
                      ? (templateData?.email?.html ?? undefined)
                      : undefined,
                  message:
                    templateType === "SMS"
                      ? (templateData?.sms?.message ?? undefined)
                      : undefined,
                }}
                sampleData={{
                  user_name: "John Doe",
                  "user.firstName": "John",
                  "user.lastName": "Doe",
                  "user.email": "john.doe@example.com",
                  organization_name: "Acme Corp",
                  customer_name: "Jane Smith",
                  invoice_number: "INV-001",
                  "deal.value": "$5,000",
                  "task.title": "Follow up call",
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
