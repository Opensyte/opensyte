"use client";

import React, { useState, useEffect } from "react";
import { type Node } from "@xyflow/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { ScrollArea } from "~/components/ui/scroll-area";
import { toast } from "sonner";
import { api } from "~/trpc/react";

interface WorkflowConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNode: Node | null;
  workflow?: {
    id: number;
    name: string;
    description: string;
    status: string;
  };
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  organizationId: string;
}

import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

interface FormData {
  name: string;
  category: string;
  triggerType: string;
  actionType: string;
  templateId: string;
  emailSubject: string;
  emailBody: string;
  smsBody: string;
  condition: {
    field: string;
    operator: string;
    value: string;
  };
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editorRef?: React.MutableRefObject<{
    insertVariable: (variableName: string) => void;
  } | null>;
}

function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  editorRef,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const insertVariableAtCursor = React.useCallback(
    (variableName: string) => {
      if (editor) {
        const variableText = `{${variableName}}`;
        editor.chain().focus().insertContent(variableText).run();
      }
    },
    [editor]
  );

  // Expose the insertVariable function through the ref
  React.useImperativeHandle(
    editorRef,
    () => ({
      insertVariable: insertVariableAtCursor,
    }),
    [insertVariableAtCursor]
  );

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Enhanced Toolbar */}
      <div className="border-b bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("bold") ? "bg-muted text-primary" : ""}`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("italic") ? "bg-muted text-primary" : ""}`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("strike") ? "bg-muted text-primary" : ""}`}
              title="Strikethrough"
            >
              <span className="text-sm font-bold line-through">S</span>
            </Button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`h-8 px-2 text-sm ${editor?.isActive("heading", { level: 1 }) ? "bg-muted text-primary" : ""}`}
              title="Heading 1"
            >
              H1
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`h-8 px-2 text-sm ${editor?.isActive("heading", { level: 2 }) ? "bg-muted text-primary" : ""}`}
              title="Heading 2"
            >
              H2
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={`h-8 px-2 text-sm ${editor?.isActive("heading", { level: 3 }) ? "bg-muted text-primary" : ""}`}
              title="Heading 3"
            >
              H3
            </Button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("bulletList") ? "bg-muted text-primary" : ""}`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("orderedList") ? "bg-muted text-primary" : ""}`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          {/* Block Elements */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`h-8 px-2 text-sm ${editor?.isActive("blockquote") ? "bg-muted text-primary" : ""}`}
              title="Quote"
            >
              &quot;
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`h-8 px-2 text-sm ${editor?.isActive("codeBlock") ? "bg-muted text-primary" : ""}`}
              title="Code Block"
            >
              &lt;/&gt;
            </Button>
          </div>

          {/* History */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-4 min-h-[140px] max-h-[400px] overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-gray-100 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded"
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}

// Template variables - these should come from the API eventually
const templateVariables = [
  {
    id: 1,
    name: "USER_NAME",
    description: "Name of the user",
    variableName: "USER_NAME",
    category: "user",
    sampleValue: "John Doe",
  },
  {
    id: 2,
    name: "USER_EMAIL",
    description: "Email of the user",
    variableName: "USER_EMAIL",
    category: "user",
    sampleValue: "john@example.com",
  },
  {
    id: 3,
    name: "DEAL_ID",
    description: "ID of the deal",
    variableName: "DEAL_ID",
    category: "deal",
    sampleValue: "DEAL123",
  },
  {
    id: 4,
    name: "DEAL_NAME",
    description: "Name of the deal",
    variableName: "DEAL_NAME",
    category: "deal",
    sampleValue: "Big Sale",
  },
  {
    id: 5,
    name: "CUSTOMER_NAME",
    description: "Name of the customer",
    variableName: "CUSTOMER_NAME",
    category: "customer",
    sampleValue: "Acme Corp",
  },
  {
    id: 6,
    name: "ORGANIZATION_NAME",
    description: "Name of the organization",
    variableName: "ORGANIZATION_NAME",
    category: "organization",
    sampleValue: "My Company",
  },
];

export function WorkflowConfigSheet({
  open,
  onOpenChange,
  selectedNode,
  workflow,
  onNodeUpdate,
  organizationId,
}: WorkflowConfigSheetProps) {
  const utils = api.useUtils();
  const [triggerConfigOpen, setTriggerConfigOpen] = useState(true);
  const [actionConfigOpen, setActionConfigOpen] = useState(true);
  const [variablesOpen, setVariablesOpen] = useState(false);

  // API queries
  const { data: actionTemplates, isLoading: isLoadingTemplates } =
    api.workflows.actions.getActionTemplates.useQuery(
      { organizationId },
      { enabled: !!organizationId && open }
    );

  // API queries (triggers for future use)
  // const { data: workflowTriggers } =
  //   api.workflows.triggers.getTriggers.useQuery(
  //     {
  //       workflowId: workflow?.id ? workflow.id.toString() : '',
  //       organizationId
  //     },
  //     { enabled: !!workflow?.id && !!organizationId && open }
  //   );

  // Mutations
  const createEmailActionMutation =
    api.workflows.actionSystem.createEmailAction.useMutation({
      onSuccess: () => {
        toast.success("Email action created successfully");
        onOpenChange(false);
        void utils.workflows.nodes.getNodes.invalidate();
      },
      onError: err => {
        toast.error("Failed to create email action", {
          description: err.message,
        });
      },
    });

  const createSmsActionMutation =
    api.workflows.actionSystem.createSmsAction.useMutation({
      onSuccess: () => {
        toast.success("SMS action created successfully");
        onOpenChange(false);
        void utils.workflows.nodes.getNodes.invalidate();
      },
      onError: (err: { message: string }) => {
        toast.error("Failed to create SMS action", {
          description: err.message,
        });
      },
    });

  const emailBodyEditorRef = React.useRef<{
    insertVariable: (variableName: string) => void;
  } | null>(null);
  const smsBodyEditorRef = React.useRef<{
    insertVariable: (variableName: string) => void;
  } | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      name: "",
      category: "",
      triggerType: "",
      actionType: "",
      templateId: "",
      emailSubject: "",
      emailBody: "",
      smsBody: "",
      condition: {
        field: "",
        operator: "equals",
        value: "",
      },
    },
  });

  useEffect(() => {
    if (selectedNode) {
      const nodeData = selectedNode.data;
      form.reset({
        name: (nodeData.name as string) ?? (nodeData.label as string) ?? "",
        category: (nodeData.category as string) ?? "",
        triggerType: (nodeData.triggerType as string) ?? "",
        actionType: (nodeData.actionType as string) ?? "",
        templateId: (nodeData.templateId as string) ?? "",
        emailSubject: (nodeData.emailSubject as string) ?? "",
        emailBody: (nodeData.emailBody as string) ?? "",
        smsBody: (nodeData.smsBody as string) ?? "",
        condition: {
          field: "",
          operator: "equals",
          value: "",
        },
      });
    }
  }, [selectedNode, workflow, form]);

  const onSubmit = async (data: FormData) => {
    if (!selectedNode) return;

    try {
      // Update node data optimistically
      onNodeUpdate(selectedNode.id, {
        ...data,
        name: data.name,
        label: data.name, // Keep label in sync with name for backward compatibility
      });

      // Handle action creation based on type
      if (selectedNode.type === "action" && selectedNode.data?.nodeId) {
        const nodeId = selectedNode.data.nodeId as string;

        switch (data.actionType) {
          case "email":
            await createEmailActionMutation.mutateAsync({
              nodeId,
              organizationId,
              subject: data.emailSubject,
              htmlBody: data.emailBody,
              toEmails: ["placeholder@example.com"], // This should come from form
              trackOpens: true,
              trackClicks: true,
            });
            break;

          case "sms":
            await createSmsActionMutation.mutateAsync({
              nodeId,
              organizationId,
              message: data.smsBody,
              toNumbers: ["+1234567890"], // This should come from form
            });
            break;

          default:
            toast.info("Action type configuration not yet implemented");
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save configuration");
    }
  };

  const insertVariable = (variableName: string) => {
    const actionType = form.watch("actionType");

    if (actionType === "email") {
      emailBodyEditorRef.current?.insertVariable(variableName);
    } else if (actionType === "sms") {
      smsBodyEditorRef.current?.insertVariable(variableName);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="flex items-center gap-2">
                {workflow?.name}
                <Button
                  size="sm"
                  variant={
                    workflow?.status === "ACTIVE" ? "default" : "secondary"
                  }
                  className="gap-2"
                >
                  {workflow?.status === "ACTIVE" ? (
                    <>
                      <Play className="h-4 w-4" />
                      Active
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Inactive
                    </>
                  )}
                </Button>
              </SheetTitle>
              <SheetDescription>
                Configure your workflow trigger, actions, and settings
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Node Name Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Node Configuration
                    </CardTitle>
                    <CardDescription>
                      Basic settings for this {selectedNode?.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Enter ${selectedNode?.type} name`}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this {selectedNode?.type}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Trigger Configuration */}
                {selectedNode?.type === "trigger" && (
                  <Card>
                    <Collapsible
                      open={triggerConfigOpen}
                      onOpenChange={setTriggerConfigOpen}
                    >
                      <CardHeader>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start p-0"
                          >
                            <div className="flex items-center gap-2">
                              {triggerConfigOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <CardTitle className="text-lg">
                                Trigger Configuration
                              </CardTitle>
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CardDescription>
                          Configure when this workflow should run
                        </CardDescription>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="CRM">CRM</SelectItem>
                                    <SelectItem value="HR">HR</SelectItem>
                                    <SelectItem value="Finance">
                                      Finance
                                    </SelectItem>
                                    <SelectItem value="PM">
                                      Project Management
                                    </SelectItem>
                                    <SelectItem value="System">
                                      System
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The module or category this trigger belongs to
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="triggerType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Trigger Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select trigger type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="customer_created">
                                      Customer Created
                                    </SelectItem>
                                    <SelectItem value="customer_updated">
                                      Customer Updated
                                    </SelectItem>
                                    <SelectItem value="deal_created">
                                      Deal Created
                                    </SelectItem>
                                    <SelectItem value="deal_status_updated">
                                      Deal Status Updated
                                    </SelectItem>
                                    <SelectItem value="employee_created">
                                      Employee Created
                                    </SelectItem>
                                    <SelectItem value="employee_updated">
                                      Employee Updated
                                    </SelectItem>
                                    <SelectItem value="invoice_created">
                                      Invoice Created
                                    </SelectItem>
                                    <SelectItem value="invoice_status_updated">
                                      Invoice Status Updated
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The specific event that will trigger this
                                  workflow
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* Action Configuration */}
                {selectedNode?.type === "action" && (
                  <Card>
                    <Collapsible
                      open={actionConfigOpen}
                      onOpenChange={setActionConfigOpen}
                    >
                      <CardHeader>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start p-0"
                          >
                            <div className="flex items-center gap-2">
                              {actionConfigOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <CardTitle className="text-lg">
                                Action Configuration
                              </CardTitle>
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CardDescription>
                          Configure what action to perform
                        </CardDescription>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="actionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Action Type</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select action type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="email">
                                      Send Email
                                    </SelectItem>
                                    <SelectItem value="sms">
                                      Send SMS
                                    </SelectItem>
                                    <SelectItem value="webhook">
                                      Call Webhook
                                    </SelectItem>
                                    <SelectItem value="slack">
                                      Send Slack Message
                                    </SelectItem>
                                    <SelectItem value="calendar">
                                      Create Calendar Event
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  The type of action to perform
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="templateId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Template</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  disabled={isLoadingTemplates}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue
                                        placeholder={
                                          isLoadingTemplates
                                            ? "Loading templates..."
                                            : "Select a template"
                                        }
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {actionTemplates?.map(template => (
                                      <SelectItem
                                        key={template.id}
                                        value={template.id.toString()}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{template.name}</span>
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {template.category}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    )) ?? []}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Choose a pre-configured template for this
                                  action
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("actionType") === "email" && (
                            <>
                              <FormField
                                control={form.control}
                                name="emailSubject"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email Subject</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Enter email subject"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Use variables like {"{USER_NAME}"} for
                                      dynamic content
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="emailBody"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email Body</FormLabel>
                                    <FormControl>
                                      <RichTextEditor
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Enter email content with rich text formatting"
                                        editorRef={emailBodyEditorRef}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Use variables like {"{USER_NAME}"} for
                                      dynamic content. You can format text using
                                      the toolbar.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                          {form.watch("actionType") === "sms" && (
                            <FormField
                              control={form.control}
                              name="smsBody"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>SMS Message</FormLabel>
                                  <FormControl>
                                    <RichTextEditor
                                      value={field.value}
                                      onChange={field.onChange}
                                      placeholder="Enter SMS message content"
                                      editorRef={smsBodyEditorRef}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Use variables like {"{USER_NAME}"} for
                                    dynamic content. Keep messages concise for
                                    SMS.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* Variables Panel */}
                <Card>
                  <Collapsible
                    open={variablesOpen}
                    onOpenChange={setVariablesOpen}
                  >
                    <CardHeader>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start p-0"
                        >
                          <div className="flex items-center gap-2">
                            {variablesOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <CardTitle className="text-lg">
                              Available Variables
                            </CardTitle>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CardDescription>
                        Click variables to insert them into text fields
                      </CardDescription>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-3">
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
                            <div key={category}>
                              <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                                {category}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {variables.map(variable => (
                                  <Button
                                    key={variable.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-auto p-2 text-xs"
                                    onClick={() =>
                                      insertVariable(variable.variableName)
                                    }
                                    title={`Sample: ${variable.sampleValue}`}
                                  >
                                    <code className="bg-blue-100 dark:bg-blue-900/20 px-1 rounded text-blue-600 dark:text-blue-400">
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <ClientPermissionGuard
                    requiredAnyPermissions={[PERMISSIONS.WORKFLOWS_WRITE]}
                  >
                    <Button
                      type="submit"
                      disabled={
                        createEmailActionMutation.isPending ||
                        createSmsActionMutation.isPending
                      }
                    >
                      {(createEmailActionMutation.isPending ||
                        createSmsActionMutation.isPending) && (
                        <span className="mr-2">⏳</span>
                      )}
                      Save Configuration
                    </Button>
                  </ClientPermissionGuard>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
