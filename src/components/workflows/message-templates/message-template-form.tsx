"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Skeleton } from "~/components/ui/skeleton";
import {
  AlertCircle,
  Save,
  ArrowLeft,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { MessageTemplateEditor } from "./message-template-editor";
import { MessageTemplatePreview } from "./message-template-preview";
import type {
  MessageChannel,
  EmailTemplate,
  SmsTemplate,
} from "~/types/message-templates";
import { SystemTemplateService } from "~/lib/system-templates";

// Template variables available for use
const templateVariables = [
  // User variables
  {
    id: 1,
    name: "User name",
    description: "Name of the user who triggered the action",
    variableName: "user_name",
    category: "user",
    sampleValue: "John Doe",
  },
  {
    id: 2,
    name: "User email",
    description: "Email of the user who triggered the action",
    variableName: "user_email",
    category: "user",
    sampleValue: "john@example.com",
  },
  // Organization variables
  {
    id: 10,
    name: "Organization name",
    description: "Name of the organization",
    variableName: "organization_name",
    category: "organization",
    sampleValue: "My Company",
  },
  // Customer / Contact (CRM)
  {
    id: 20,
    name: "Customer name",
    description: "Customer full name",
    variableName: "customer_name",
    category: "customer",
    sampleValue: "Jane Smith",
  },
  {
    id: 21,
    name: "Customer first name",
    description: "Customer first name",
    variableName: "customer_first_name",
    category: "customer",
    sampleValue: "Jane",
  },
  {
    id: 22,
    name: "Customer last name",
    description: "Customer last name",
    variableName: "customer_last_name",
    category: "customer",
    sampleValue: "Smith",
  },
  {
    id: 23,
    name: "Customer email",
    description: "Customer email address",
    variableName: "customer_email",
    category: "customer",
    sampleValue: "jane@acme.com",
  },
  {
    id: 24,
    name: "Customer phone",
    description: "Customer phone number",
    variableName: "customer_phone",
    category: "customer",
    sampleValue: "+1 202 555 0100",
  },
  {
    id: 25,
    name: "Customer company",
    description: "Customer company name",
    variableName: "customer_company",
    category: "customer",
    sampleValue: "Acme Corp",
  },
  // Deal (CRM)
  {
    id: 30,
    name: "Deal title",
    description: "Deal title",
    variableName: "deal_title",
    category: "deal",
    sampleValue: "Enterprise Plan",
  },
  {
    id: 31,
    name: "Deal value",
    description: "Deal value",
    variableName: "deal_value",
    category: "deal",
    sampleValue: "1999",
  },
  {
    id: 32,
    name: "Deal status",
    description: "Deal status",
    variableName: "deal_status",
    category: "deal",
    sampleValue: "QUALIFIED",
  },
  // Finance - Invoice
  {
    id: 40,
    name: "Invoice number",
    description: "Invoice number",
    variableName: "invoice_number",
    category: "invoice",
    sampleValue: "INV-202501-12",
  },
  {
    id: 41,
    name: "Invoice amount",
    description: "Invoice total amount",
    variableName: "invoice_amount",
    category: "invoice",
    sampleValue: "4500",
  },
  {
    id: 42,
    name: "Invoice due date",
    description: "Invoice due date",
    variableName: "invoice_due_date",
    category: "invoice",
    sampleValue: "2025-09-30",
  },
  // Project Management
  {
    id: 60,
    name: "Project name",
    description: "Project name",
    variableName: "project_name",
    category: "project",
    sampleValue: "Website Redesign",
  },
  {
    id: 61,
    name: "Project status",
    description: "Project status",
    variableName: "project_status",
    category: "project",
    sampleValue: "IN_PROGRESS",
  },
  // Tasks
  {
    id: 70,
    name: "Task title",
    description: "Task title",
    variableName: "task_title",
    category: "task",
    sampleValue: "Design hero section",
  },
  {
    id: 71,
    name: "Task status",
    description: "Task status",
    variableName: "task_status",
    category: "task",
    sampleValue: "TODO",
  },
  {
    id: 72,
    name: "Task assignee",
    description: "Task assignee name",
    variableName: "task_assignee",
    category: "task",
    sampleValue: "Alex Parker",
  },
];

// Validation schema
const messageTemplateSchema = z
  .object({
    templateId: z.string().optional(),
    baseTemplateId: z.string().optional(),
    name: z
      .string()
      .min(1, "Template name is required")
      .max(100, "Template name must be less than 100 characters"),
    description: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional(),
    type: z.enum(["EMAIL", "SMS"], {
      required_error: "Template type is required",
    }),
    template: z.object({
      email: z
        .object({
          subject: z.string(),
          html: z.string(),
        })
        .optional(),
      sms: z
        .object({
          message: z.string(),
        })
        .optional(),
    }),
    requiredVariables: z.array(z.string()).default([]),
    optionalVariables: z.array(z.string()).default([]),
  })
  .refine(
    data => {
      // Email validation: subject and html are required for EMAIL type
      if (data.type === "EMAIL") {
        const emailData = data.template.email;
        if (!emailData?.subject || emailData.subject.trim().length === 0) {
          return false;
        }
        if (!emailData?.html || emailData.html.trim().length === 0) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Email subject and content are required for email templates",
      path: ["template.email"],
    }
  )
  .refine(
    data => {
      // SMS validation: message is required for SMS type
      if (data.type === "SMS") {
        const smsData = data.template.sms;
        if (!smsData?.message || smsData.message.trim().length === 0) {
          return false;
        }
      }
      return true;
    },
    {
      message: "SMS message is required for SMS templates",
      path: ["template.sms"],
    }
  );

type MessageTemplateFormData = z.infer<typeof messageTemplateSchema>;

interface MessageTemplateFormProps {
  organizationId: string;
  templateId?: string;
  mode: "create" | "edit";
}

export function MessageTemplateForm({
  organizationId,
  templateId,
  mode,
}: MessageTemplateFormProps) {
  const router = useRouter();

  // Refs for editor components to enable variable insertion
  const editorRef = useRef<{
    insertVariable: (variableName: string) => void;
  } | null>(null);

  // State for variables panel
  const [variablesOpen, setVariablesOpen] = useState(false);

  // Get existing template for edit mode
  const { data: existingTemplate, isLoading: isLoadingTemplate } =
    api.workflows.actions.getActionTemplate.useQuery(
      { templateId: templateId!, organizationId },
      { enabled: mode === "edit" && !!templateId }
    );

  // Fetch available action templates for selection
  const { data: actionTemplates, isLoading: isLoadingTemplates } =
    api.workflows.actions.getActionTemplates.useQuery(
      { organizationId },
      { enabled: !!organizationId }
    );

  // Form setup with typed interface and validation
  const form = useForm<MessageTemplateFormData>({
    resolver: zodResolver(messageTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      baseTemplateId: "",
      type: "EMAIL" as const,
      template: {
        email: {
          subject: "",
          html: "",
        },
        sms: {
          message: "",
        },
      },
      requiredVariables: [],
      optionalVariables: [],
      ...(mode === "edit" && templateId && { templateId }),
    },
  });

  // Watch form values for live preview
  const type = form.watch("type");

  // Fetch base template details when a base template is selected
  const selectedBaseTemplateId = form.watch("baseTemplateId");
  const { data: baseTemplateData } =
    api.workflows.actions.getActionTemplate.useQuery(
      { templateId: selectedBaseTemplateId!, organizationId },
      { enabled: !!selectedBaseTemplateId && selectedBaseTemplateId !== "" }
    );

  // Mutations
  useEffect(() => {
    if (existingTemplate && mode === "edit") {
      const templateData = existingTemplate.template as
        | EmailTemplate
        | SmsTemplate;

      form.reset({
        templateId: existingTemplate.id,
        name: existingTemplate.name,
        description: existingTemplate.description ?? "",
        type: existingTemplate.type as MessageChannel,
        template: templateData,
        requiredVariables: Array.isArray(existingTemplate.requiredVariables)
          ? (existingTemplate.requiredVariables as string[])
          : [],
        optionalVariables: Array.isArray(existingTemplate.optionalVariables)
          ? (existingTemplate.optionalVariables as string[])
          : [],
      });
    }
  }, [existingTemplate, form, mode]);

  // Load base template content when selected
  useEffect(() => {
    if (baseTemplateData && selectedBaseTemplateId && mode === "create") {
      const templateData = baseTemplateData.template as
        | EmailTemplate
        | SmsTemplate;

      if (type === "EMAIL" && baseTemplateData.type === "EMAIL") {
        const emailData = (templateData as EmailTemplate).email;
        if (emailData) {
          form.setValue("template.email.subject", emailData.subject ?? "");
          form.setValue("template.email.html", emailData.html ?? "");
        }
      } else if (type === "SMS" && baseTemplateData.type === "SMS") {
        const smsData = (templateData as SmsTemplate).sms;
        if (smsData) {
          form.setValue("template.sms.message", smsData.message ?? "");
        }
      }
    }
  }, [baseTemplateData, selectedBaseTemplateId, type, form, mode]);

  // Mutations
  const createMutation = api.workflows.actions.createActionTemplate.useMutation(
    {
      onSuccess: data => {
        toast.success("Template created successfully");
        router.push(
          `/${organizationId}/workflows/message-templates/${data.id}`
        );
      },
      onError: error => {
        toast.error(error.message);
      },
    }
  );

  const updateMutation = api.workflows.actions.updateActionTemplate.useMutation(
    {
      onSuccess: data => {
        toast.success("Template updated successfully");
        router.push(
          `/${organizationId}/workflows/message-templates/${data.id}`
        );
      },
      onError: error => {
        toast.error(error.message);
      },
    }
  );

  const onSubmit = (data: MessageTemplateFormData) => {
    // Create properly typed template object based on channel
    const templateData: EmailTemplate | SmsTemplate =
      data.type === "EMAIL"
        ? {
            email: {
              subject: data.template.email?.subject ?? "",
              html: data.template.email?.html ?? "",
            },
          }
        : {
            sms: {
              message: data.template.sms?.message ?? "",
            },
          };

    if (mode === "create") {
      createMutation.mutate({
        organizationId,
        name: data.name,
        description: data.description,
        category: "COMMUNICATION" as const,
        type: data.type,
        template: templateData,
        requiredVariables: data.requiredVariables ?? [],
        optionalVariables: data.optionalVariables ?? [],
        version: "1.0.0",
        isPublic: false,
      });
    } else {
      updateMutation.mutate({
        templateId: data.templateId!,
        organizationId,
        name: data.name,
        description: data.description,
        template: templateData,
        requiredVariables: data.requiredVariables ?? [],
        optionalVariables: data.optionalVariables ?? [],
        versionNotes: "Template updated",
      });
    }
  };

  // Function to insert variables into the editor
  const insertVariable = (variableName: string) => {
    if (editorRef.current) {
      editorRef.current.insertVariable(variableName);
    }
  };

  const handleContentChange = (contentData: {
    subject?: string;
    html?: string;
    message?: string;
  }) => {
    if (type === "EMAIL") {
      const currentTemplate = form.getValues("template");
      form.setValue("template", {
        email: {
          subject: contentData.subject ?? currentTemplate.email?.subject ?? "",
          html: contentData.html ?? currentTemplate.email?.html ?? "",
        },
      });
    } else if (type === "SMS") {
      form.setValue("template", {
        sms: {
          message: contentData.message ?? "",
        },
      });
    }
  };

  const handleVariablesChange = (
    variables: string[],
    variableType: "required" | "optional"
  ) => {
    if (variableType === "required") {
      form.setValue("requiredVariables", variables);
    } else {
      form.setValue("optionalVariables", variables);
    }
  };

  // Don't block the entire form rendering, just show loading states for individual fields
  // if (mode === "edit" && isLoadingTemplate) {
  //   return <div>Loading template...</div>;
  // }

  if (
    mode === "edit" &&
    existingTemplate &&
    SystemTemplateService.isSystemTemplate(existingTemplate.id)
  ) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() =>
            router.push(`/${organizationId}/workflows/message-templates`)
          }
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Template
            </CardTitle>
            <CardDescription>
              System templates cannot be edited. You can view the template or
              create a custom copy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  router.push(
                    `/${organizationId}/workflows/message-templates/${existingTemplate.id}`
                  )
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                View Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement copy functionality
                  toast.info("Copy functionality coming soon");
                }}
              >
                Create Custom Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() =>
          router.push(`/${organizationId}/workflows/message-templates`)
        }
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Templates
      </Button>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Configure the basic template settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  {mode === "edit" && isLoadingTemplate ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Enter template name"
                    />
                  )}
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  {mode === "edit" && isLoadingTemplate ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="Describe what this template is used for..."
                      rows={3}
                    />
                  )}
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Template Type</Label>
                  {mode === "edit" && isLoadingTemplate ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={type}
                      onValueChange={(value: MessageChannel) => {
                        form.setValue("type", value);
                        // Reset template content when type changes
                        if (value === "EMAIL") {
                          form.setValue("template", {
                            email: { subject: "", html: "" },
                          });
                        } else {
                          form.setValue("template", {
                            sms: { message: "" },
                          });
                        }
                      }}
                      disabled={mode === "edit"} // Don't allow changing type in edit mode
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">Email</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.type.message}
                    </p>
                  )}
                </div>

                {/* Base Template Selection */}
                <div className="space-y-2">
                  <Label>Base Template (Optional)</Label>
                  <Select
                    value={form.watch("baseTemplateId") ?? ""}
                    onValueChange={value => {
                      if (value === "__none__") {
                        form.setValue("baseTemplateId", "");
                        return;
                      }
                      form.setValue("baseTemplateId", value);
                      // Note: Template content will be loaded when the user starts editing
                      // This is just for selection - the actual loading happens in a useEffect
                    }}
                    disabled={isLoadingTemplates}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingTemplates
                            ? "Loading templates..."
                            : "Choose a base template (optional)"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">
                          Create from scratch
                        </span>
                      </SelectItem>
                      {actionTemplates
                        ?.filter(template => template.type === type)
                        ?.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.name}</span>
                              {template.category && (
                                <span className="text-xs text-muted-foreground">
                                  ({template.category})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select an existing template to use as a starting point, or
                    create from scratch
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
                <CardDescription>
                  Create your {type?.toLowerCase?.() ?? "message"} template
                  content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {type && (
                  <MessageTemplateEditor
                    ref={editorRef}
                    type={type}
                    value={{
                      subject:
                        type === "EMAIL"
                          ? form.watch("template")?.email?.subject
                          : undefined,
                      html:
                        type === "EMAIL"
                          ? form.watch("template")?.email?.html
                          : undefined,
                      message:
                        type === "SMS"
                          ? form.watch("template")?.sms?.message
                          : undefined,
                    }}
                    onChange={handleContentChange}
                    variables={{
                      required: form.watch("requiredVariables") ?? [],
                      optional: form.watch("optionalVariables") ?? [],
                    }}
                    onVariablesChange={handleVariablesChange}
                    errors={{
                      subject: form.formState.errors.template?.message,
                      html: form.formState.errors.template?.message,
                      message: form.formState.errors.template?.message,
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Variables Panel */}
            <Card>
              <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-0 hover:bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        {variablesOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <CardTitle>Available Variables</CardTitle>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CardDescription className="ml-7">
                    Click on any variable to insert it into your template
                    content
                  </CardDescription>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(
                        templateVariables.reduce(
                          (acc, variable) => {
                            if (!acc[variable.category]) {
                              acc[variable.category] = [];
                            }
                            acc[variable.category]!.push(variable);
                            return acc;
                          },
                          {} as Record<string, typeof templateVariables>
                        )
                      ).map(([category, variables]) => (
                        <div key={category} className="space-y-3">
                          <h4 className="font-medium text-sm text-muted-foreground capitalize flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            {category}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {variables.map(variable => (
                              <Button
                                key={variable.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto p-3 text-xs hover:bg-primary/5 hover:border-primary/20 transition-colors"
                                onClick={() =>
                                  insertVariable(variable.variableName)
                                }
                                title={`${variable.description}. Sample: ${variable.sampleValue}`}
                              >
                                <code className="bg-primary/10 px-2 py-1 rounded text-primary font-mono">
                                  {"{" + variable.variableName + "}"}
                                </code>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* UI Layout Configurations */}
            <Card>
              <CardHeader>
                <CardTitle>UI Layout Configurations</CardTitle>
                <CardDescription>
                  Advanced layout and variable configuration options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8 text-center text-muted-foreground">
                  <div>
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">Coming soon</p>
                    <p className="text-xs">
                      Variable mapping and advanced layout options will be
                      available in a future update.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  See how your template will look to recipients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {type && (
                  <MessageTemplatePreview
                    type={type}
                    data={{
                      subject:
                        type === "EMAIL"
                          ? form.watch("template")?.email?.subject
                          : undefined,
                      html:
                        type === "EMAIL"
                          ? form.watch("template")?.email?.html
                          : undefined,
                      message:
                        type === "SMS"
                          ? form.watch("template")?.sms?.message
                          : undefined,
                    }}
                    sampleData={{
                      // User variables
                      user_name: "John Doe",
                      user_email: "john@example.com",
                      // Organization variables
                      organization_name: "Acme Corp",
                      // Customer variables
                      customer_name: "Jane Smith",
                      customer_first_name: "Jane",
                      customer_last_name: "Smith",
                      customer_email: "jane@acme.com",
                      customer_phone: "+1 202 555 0100",
                      customer_company: "Acme Corp",
                      // Deal variables
                      deal_title: "Enterprise Plan",
                      deal_value: "$1,999",
                      deal_status: "QUALIFIED",
                      // Invoice variables
                      invoice_number: "INV-202501-12",
                      invoice_amount: "$4,500",
                      invoice_due_date: "2025-09-30",
                      // Project variables
                      project_name: "Website Redesign",
                      project_status: "IN_PROGRESS",
                      // Task variables
                      task_title: "Design hero section",
                      task_status: "TODO",
                      task_assignee: "Alex Parker",
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(`/${organizationId}/workflows/message-templates`)
            }
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {mode === "create" ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
