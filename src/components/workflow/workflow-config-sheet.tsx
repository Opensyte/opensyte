"use client";

import React, { useState, useEffect } from "react";
import { type Node } from "@xyflow/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "~/components/ui/scroll-area";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { WorkflowTriggerTypeSchema } from "../../../prisma/generated/zod";
import { z } from "zod";

// Add a narrow type for templates we render in the select
type ActionTemplateSummary = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  type: string; // WorkflowNodeType (e.g., EMAIL, SMS)
  isActive: boolean;
  isLocked?: boolean;
  requiredVariables?: unknown;
  optionalVariables?: unknown;
};

interface WorkflowConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNode: Node | null;
  workflow?: {
    id: string;
    name: string;
    description: string;
    status: string;
  };
  onNodeUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  organizationId: string;
}

import { ClientPermissionGuard } from "~/components/shared/client-permission-guard";
import { PERMISSIONS } from "~/lib/rbac";

// Form validation schema
const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    category: z.string().optional(),
    triggerType: z.string().optional(),
    eventType: z.string().optional(),
    actionType: z.string().optional(),
    templateId: z.string().optional(),
    templateMode: z.enum(["TEMPLATE", "CUSTOM"]).default("CUSTOM").optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    smsBody: z.string().optional(),
    condition: z
      .object({
        field: z.string(),
        operator: z.string(),
        value: z.string(),
      })
      .optional(),
  })
  .refine(
    data => {
      // Conditional validation for email actions
      if (data.actionType === "email") {
        return data.emailSubject && data.emailSubject.trim().length > 0;
      }
      return true;
    },
    {
      message: "Email subject is required for email actions",
      path: ["emailSubject"],
    }
  )
  .refine(
    data => {
      // Conditional validation for email body
      if (data.actionType === "email") {
        return data.emailBody && data.emailBody.trim().length > 0;
      }
      return true;
    },
    {
      message: "Email body is required for email actions",
      path: ["emailBody"],
    }
  )
  .refine(
    data => {
      // Conditional validation for SMS actions
      if (data.actionType === "sms") {
        return data.smsBody && data.smsBody.trim().length > 0;
      }
      return true;
    },
    {
      message: "SMS message is required for SMS actions",
      path: ["smsBody"],
    }
  );

type FormData = z.infer<typeof formSchema>;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  editorRef?: React.MutableRefObject<{
    insertVariable: (variableName: string) => void;
  } | null>;
}

function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter content...",
  disabled = false,
  editorRef,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: "prose-bullet-list",
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "prose-ordered-list",
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: "prose-list-item",
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      if (!disabled) {
        onChange(editor.getHTML());
      }
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
    <div
      className={`border border-border/50 rounded-lg overflow-hidden shadow-sm ${disabled ? "bg-muted/50" : ""}`}
    >
      {/* Enhanced Toolbar */}
      <div
        className={`border-b p-3 ${disabled ? "bg-muted/50" : "bg-muted/20"}`}
      >
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-border/50 pr-3 mr-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("bold") ? "bg-primary/10 text-primary" : ""}`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("italic") ? "bg-primary/10 text-primary" : ""}`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("strike") ? "bg-primary/10 text-primary" : ""}`}
              title="Strikethrough"
            >
              <span className="text-sm font-bold line-through">S</span>
            </Button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r border-border/50 pr-3 mr-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`h-8 px-2 text-sm ${editor?.isActive("heading", { level: 1 }) ? "bg-primary/10 text-primary" : ""}`}
              title="Heading 1"
            >
              H1
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`h-8 px-2 text-sm ${editor?.isActive("heading", { level: 2 }) ? "bg-primary/10 text-primary" : ""}`}
              title="Heading 2"
            >
              H2
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className={`h-8 px-2 text-sm ${editor?.isActive("heading", { level: 3 }) ? "bg-primary/10 text-primary" : ""}`}
              title="Heading 3"
            >
              H3
            </Button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-border/50 pr-3 mr-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("bulletList") ? "bg-primary/10 text-primary" : ""}`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`h-8 w-8 p-0 ${editor?.isActive("orderedList") ? "bg-primary/10 text-primary" : ""}`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          {/* Block Elements */}
          <div className="flex items-center gap-1 border-r border-border/50 pr-3 mr-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`h-8 px-2 text-sm ${editor?.isActive("blockquote") ? "bg-primary/10 text-primary" : ""}`}
              title="Quote"
            >
              &quot;
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`h-8 px-2 text-sm ${editor?.isActive("codeBlock") ? "bg-primary/10 text-primary" : ""}`}
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
              disabled={disabled || !editor?.can().undo()}
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
              disabled={disabled || !editor?.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div
        className={`p-4 min-h-[140px] max-h-[400px] overflow-y-auto ${disabled ? "bg-muted/30" : "bg-background"}`}
      >
        <EditorContent
          editor={editor}
          className={`prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border/50 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-muted/50 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_code]:bg-muted/50 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_li]:my-1 ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}

// Trigger mapping based on categories
type TriggerOption = {
  value: string;
  label: string;
  description: string;
  eventType?: string;
};

const triggerMapping: Record<string, TriggerOption[]> = {
  CRM: [
    {
      value: "CONTACT_CREATED",
      label: "Contact Created",
      description: "When a new contact is created",
      eventType: "created",
    },
    {
      value: "CONTACT_UPDATED",
      label: "Contact Updated",
      description: "When a contact is updated",
      eventType: "updated",
    },
    {
      value: "DEAL_CREATED",
      label: "Deal Created",
      description: "When a new deal is created",
      eventType: "created",
    },
    {
      value: "DEAL_STATUS_CHANGED",
      label: "Deal Status Changed",
      description: "When a deal status changes",
      eventType: "status_changed",
    },
  ],
  HR: [
    {
      value: "EMPLOYEE_CREATED",
      label: "Employee Created",
      description: "When a new employee is added",
      eventType: "created",
    },
    {
      value: "EMPLOYEE_UPDATED",
      label: "Employee Updated",
      description: "When employee info is updated",
      eventType: "updated",
    },
    {
      value: "EMPLOYEE_STATUS_CHANGED",
      label: "Employee Status Changed",
      description: "When employee status changes",
      eventType: "status_changed",
    },
    {
      value: "TIME_OFF_REQUESTED",
      label: "Time-off Request",
      description: "When time-off is requested",
      eventType: "requested",
    },
  ],
  Finance: [
    {
      value: "INVOICE_CREATED",
      label: "Invoice Created",
      description: "When a new invoice is created",
      eventType: "created",
    },
    {
      value: "INVOICE_STATUS_CHANGED",
      label: "Invoice Status Changed",
      description: "When invoice status changes",
      eventType: "status_changed",
    },
    {
      value: "EXPENSE_CREATED",
      label: "Expense Created",
      description: "When a new expense is recorded",
      eventType: "created",
    },
    {
      value: "PAYMENT_STATUS_CHANGED",
      label: "Payment Status Changed",
      description: "When payment status updates",
      eventType: "status_changed",
    },
  ],
  PM: [
    {
      value: "PROJECT_CREATED",
      label: "Project Created",
      description: "When a new project is created",
      eventType: "created",
    },
    {
      value: "PROJECT_UPDATED",
      label: "Project Updated",
      description: "When project details are updated",
      eventType: "updated",
    },
    {
      value: "TASK_CREATED",
      label: "Task Created",
      description: "When a new task is created",
      eventType: "created",
    },
    {
      value: "TASK_STATUS_CHANGED",
      label: "Task Status Changed",
      description: "When task status changes",
      eventType: "status_changed",
    },
  ],
};

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      triggerType: "",
      eventType: "",
      actionType: "",
      templateId: "",
      templateMode: "CUSTOM",
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

  // API queries
  const { data: actionTemplates, isLoading: isLoadingTemplates } =
    api.workflows.actions.getActionTemplates.useQuery(
      { organizationId },
      { enabled: !!organizationId && open }
    );

  // Fetch full template details when a template is selected
  const selectedTemplateId = (form.watch("templateId") ?? "").trim();
  const templateDetailsQuery = api.workflows.actions.getActionTemplate.useQuery(
    { templateId: selectedTemplateId, organizationId },
    { enabled: open && !!organizationId && !!selectedTemplateId }
  );

  const [isTemplateLocked, setIsTemplateLocked] = useState<boolean>(false);

  // API queries for trigger data
  const {
    data: nodeTrigger,
    refetch: refetchTrigger,
    isFetching: isFetchingTrigger,
  } = api.workflows.triggers.getNodeTrigger.useQuery(
    {
      workflowId: workflow?.id ?? "",
      organizationId,
      nodeId: selectedNode?.id ?? "",
    },
    {
      enabled:
        !!workflow?.id &&
        !!organizationId &&
        !!selectedNode?.id &&
        selectedNode?.type === "trigger" &&
        open,
      refetchOnWindowFocus: false,
    }
  );

  // Mutations
  const createEmailActionMutation =
    api.workflows.actionSystem.createEmailAction.useMutation({
      onSuccess: () => {
        toast.success("Email action created successfully");
        onOpenChange(false);
        void utils.workflows.nodes.getNodes.invalidate();
        void utils.workflows.actionSystem.getNodeActions.invalidate();
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

  // Trigger mutations
  const createOrUpdateTriggerMutation =
    api.workflows.triggers.createOrUpdateNodeTrigger.useMutation({
      onSuccess: () => {
        toast.success("Trigger configuration saved successfully");
        onOpenChange(false);
        void utils.workflows.nodes.getNodes.invalidate();
        void refetchTrigger();
      },
      onError: (err: { message: string }) => {
        toast.error("Failed to save trigger configuration", {
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

  // When a template is selected, if locked and of matching action type, set content and lock editors
  useEffect(() => {
    if (!open) return;
    const currentActionType = form.getValues("actionType");
    if (!currentActionType) return;

    // If Custom selected
    if (!selectedTemplateId) {
      setIsTemplateLocked(false);
      form.setValue("templateMode", "CUSTOM");
      return;
    }

    const templateSummary = (
      actionTemplates as ActionTemplateSummary[] | undefined
    )?.find(t => t.id === selectedTemplateId);
    const templateType = templateSummary?.type ?? "";

    // Validate type matches selected actionType
    const matchesType =
      (currentActionType === "email" && templateType === "EMAIL") ||
      (currentActionType === "sms" && templateType === "SMS");

    form.setValue("templateMode", "TEMPLATE");
    setIsTemplateLocked(!!templateSummary?.isLocked);

    if (!matchesType) return;

    // Once details loaded, set content into form
    const tpl = templateDetailsQuery.data;
    if (!tpl) return;

    const templateJson = tpl.template as unknown as {
      email?: { subject?: string; html?: string };
      sms?: { message?: string };
    };

    if (currentActionType === "email") {
      const subject = templateJson?.email?.subject ?? "";
      const html = templateJson?.email?.html ?? "";
      if (subject || html) {
        form.setValue("emailSubject", subject);
        form.setValue("emailBody", html);
      }
    } else if (currentActionType === "sms") {
      const message = templateJson?.sms?.message ?? "";
      if (message) {
        form.setValue("smsBody", message);
      }
    }
  }, [
    open,
    selectedTemplateId,
    templateDetailsQuery.data,
    actionTemplates,
    form,
  ]);

  // Fetch existing actions for action nodes to repopulate
  const actionIdForActions =
    selectedNode?.type === "action"
      ? (selectedNode.data?.nodeId as string | undefined) // React Flow node.id maps to WorkflowNode.id (actionId)
      : undefined;
  const {
    data: existingActions,
    refetch: refetchActions,
    isFetching: isFetchingActions,
  } = api.workflows.actionSystem.getNodeActions.useQuery(
    { actionId: actionIdForActions ?? "", organizationId },
    {
      enabled:
        open &&
        !!organizationId &&
        !!actionIdForActions &&
        /^[a-z0-9]{25}$/i.test(actionIdForActions),
    }
  );

  // Repopulate form when existing action data loads (only if it matches the currently selected node)
  useEffect(() => {
    if (!open) return;
    if (!selectedNode) return;
    if (selectedNode.type !== "action") return;
    if (!existingActions) return;
    if (existingActions.actionId !== selectedNode.data?.nodeId) return;

    const email = existingActions.actions.email[0];
    const sms = existingActions.actions.sms[0];

    if (email) {
      form.reset({
        name:
          (selectedNode.data?.name as string) ??
          (selectedNode.data?.label as string) ??
          "",
        category: "",
        triggerType: "",
        eventType: "",
        actionType: "email",
        templateId: "",
        emailSubject: email.subject ?? "",
        emailBody: email.htmlBody ?? "",
        smsBody: "",
        condition: { field: "", operator: "equals", value: "" },
      });
    } else if (sms) {
      form.reset({
        name:
          (selectedNode.data?.name as string) ??
          (selectedNode.data?.label as string) ??
          "",
        category: "",
        triggerType: "",
        eventType: "",
        actionType: "sms",
        templateId: "",
        emailSubject: "",
        emailBody: "",
        smsBody: sms.message ?? "",
        condition: { field: "", operator: "equals", value: "" },
      });
    } else {
      // No existing actions, set defaults with node name
      form.reset({
        name:
          (selectedNode.data?.name as string) ??
          (selectedNode.data?.label as string) ??
          "",
        category: "",
        triggerType: "",
        eventType: "",
        actionType: "",
        templateId: "",
        emailSubject: "",
        emailBody: "",
        smsBody: "",
        condition: { field: "", operator: "equals", value: "" },
      });
    }
  }, [open, existingActions, selectedNode, form]);

  // Derive eventType from triggerType + category if missing
  const watchedCategory = form.watch("category");
  const watchedTriggerType = form.watch("triggerType");
  useEffect(() => {
    if (!open) return;
    const category = watchedCategory;
    const triggerType = watchedTriggerType;
    if (!category || !triggerType) return;
    const list: TriggerOption[] = triggerMapping[category] ?? [];
    const found = list.find(t => t.value === triggerType);
    if (found?.eventType) {
      form.setValue("eventType", found.eventType);
    }
  }, [open, watchedCategory, watchedTriggerType, form]);

  // Repopulate form when trigger data loads (only if it matches the currently selected node)
  useEffect(() => {
    if (!open) return;
    if (!selectedNode || selectedNode.type !== "trigger") return;
    if (!nodeTrigger) return;
    if (nodeTrigger.nodeId && nodeTrigger.nodeId !== selectedNode.id) return;

    form.reset({
      name: nodeTrigger.name,
      category: nodeTrigger.module,
      triggerType: nodeTrigger.type,
      eventType: nodeTrigger.eventType,
      actionType: "",
      templateId: "",
      emailSubject: "",
      emailBody: "",
      smsBody: "",
      condition: { field: "", operator: "equals", value: "" },
    });

    // Defer setting triggerType to ensure category-dependent Select has options ready
    setTimeout(() => {
      form.setValue("triggerType", nodeTrigger.type);
      form.setValue("eventType", nodeTrigger.eventType);
    }, 0);
  }, [open, nodeTrigger, selectedNode, form]);

  useEffect(() => {
    if (!open) return;
    if (!selectedNode) return;

    // Do not override server-fetched values for the current node
    if (
      (selectedNode.type === "trigger" && nodeTrigger) ||
      (selectedNode.type === "action" &&
        existingActions &&
        existingActions.actionId ===
          (selectedNode.data?.nodeId as string | undefined))
    ) {
      return;
    }

    const nodeData = selectedNode.data ?? {};
    const category = (nodeData.category as string) ?? "";

    form.reset({
      name: (nodeData.name as string) ?? (nodeData.label as string) ?? "",
      category: category,
      triggerType: (nodeData.triggerType as string) ?? "",
      eventType: (nodeData.eventType as string) ?? "",
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
  }, [open, selectedNode, nodeTrigger, existingActions, form]);

  // Refetch when sheet opens to ensure fresh data
  useEffect(() => {
    if (!open) return;
    if (selectedNode?.type === "trigger") {
      void refetchTrigger();
    }
    if (selectedNode?.type === "action") {
      void refetchActions();
    }
  }, [open, selectedNode, refetchTrigger, refetchActions]);

  // Clear form immediately when switching nodes to avoid showing previous node's values
  useEffect(() => {
    if (!open) return;
    if (!selectedNode) return;
    form.reset({
      name: "",
      category: "",
      triggerType: "",
      eventType: "",
      actionType: "",
      templateId: "",
      emailSubject: "",
      emailBody: "",
      smsBody: "",
      condition: { field: "", operator: "equals", value: "" },
    });
  }, [open, selectedNode?.id, form, selectedNode]);

  const onSubmit = async (data: FormData) => {
    if (!selectedNode) return;

    try {
      // Additional validation for action-specific required fields
      if (selectedNode.type === "action") {
        // If template mode is TEMPLATE, content can be omitted (backend enforces)
        const tplMode = data.templateMode ?? "CUSTOM";
        if (data.actionType === "email" && tplMode === "CUSTOM") {
          if (!data.emailSubject?.trim()) {
            form.setError("emailSubject", {
              type: "required",
              message: "Email subject is required for email actions",
            });
            return;
          }
          if (!data.emailBody?.trim()) {
            form.setError("emailBody", {
              type: "required",
              message: "Email body is required for email actions",
            });
            return;
          }
        }
        if (data.actionType === "sms" && tplMode === "CUSTOM") {
          if (!data.smsBody?.trim()) {
            form.setError("smsBody", {
              type: "required",
              message: "SMS message is required for SMS actions",
            });
            return;
          }
        }
      }

      // Update node data optimistically
      onNodeUpdate(selectedNode.id, {
        ...data,
        name: data.name,
        label: data.name, // Keep label in sync with name for backward compatibility
      });

      // Handle trigger creation/update
      if (selectedNode.type === "trigger") {
        // Check if this is a temporary node that needs to be saved first
        const nodeId = selectedNode.data?.nodeId as string | undefined;
        const isTemporaryNode =
          nodeId?.startsWith("action_") ?? nodeId?.startsWith("trigger_");

        if (isTemporaryNode) {
          toast.error(
            "Please save the workflow first before configuring triggers",
            {
              description:
                "Click the Save button to save new nodes, then try configuring again",
            }
          );
          return;
        }

        if (!data.category?.trim()) {
          throw new Error("Category is required for triggers");
        }
        if (!data.triggerType?.trim()) {
          throw new Error("Trigger type is required for triggers");
        }

        // Validate trigger type against enum; eventType comes from separate field
        const parsedTriggerType = WorkflowTriggerTypeSchema.parse(
          data.triggerType
        );
        const eventType = (data.eventType ?? "").trim();
        if (!eventType) {
          throw new Error("Event type is required for triggers");
        }

        await createOrUpdateTriggerMutation.mutateAsync({
          workflowId: workflow?.id ?? "",
          organizationId,
          nodeId: selectedNode.id,
          name: data.name,
          type: parsedTriggerType,
          module: data.category,
          eventType,
          isActive: true,
        });

        toast.success("Trigger configuration saved successfully");
        onOpenChange(false);
        return;
      }

      // Handle action creation based on type
      if (selectedNode.type === "action" && selectedNode.data?.nodeId) {
        // Check if this is a temporary node that needs to be saved first
        const nodeId = selectedNode.data.nodeId as string;
        const isTemporaryNode =
          nodeId.startsWith("action_") || nodeId.startsWith("trigger_");

        if (isTemporaryNode) {
          toast.error(
            "Please save the workflow first before configuring actions",
            {
              description:
                "Click the Save button to save new nodes, then try configuring again",
            }
          );
          return;
        }

        const actionId = nodeId; // Use database WorkflowNode.id (CUID)
        const templateMode = data.templateMode ?? "CUSTOM";
        const templateId =
          data.templateId && data.templateId.length > 0
            ? data.templateId
            : undefined;

        switch (data.actionType) {
          case "email":
            await createEmailActionMutation.mutateAsync({
              actionId,
              organizationId,
              templateMode,
              templateId,
              subject: data.emailSubject,
              htmlBody: data.emailBody,
              trackOpens: true,
              trackClicks: true,
            });
            break;

          case "sms":
            await createSmsActionMutation.mutateAsync({
              actionId,
              organizationId,
              templateMode,
              templateId,
              message: data.smsBody,
            });
            break;

          case "webhook":
          case "slack":
          case "calendar":
            toast.error("This action type is not available yet", {
              description: "This feature is coming soon",
            });
            return;

          default:
            toast.info("Action type configuration not yet implemented");
        }
      }

      toast.success("Configuration saved successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save configuration";
      toast.error(errorMessage);
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

  // Build template options shown to the user (two ready + Custom)
  const filteredTemplates: ActionTemplateSummary[] =
    (actionTemplates as ActionTemplateSummary[] | undefined)?.filter(t => {
      const actionType = form.watch("actionType");
      if (actionType === "email") return t.type === "EMAIL";
      if (actionType === "sms") return t.type === "SMS";
      return false;
    }) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-hidden p-0 w-full sm:max-w-2xl">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-semibold text-foreground">
                  {workflow?.name ?? "Workflow Configuration"}
                </SheetTitle>
                <Button
                  size="sm"
                  variant={
                    workflow?.status === "ACTIVE" ? "default" : "secondary"
                  }
                  className="gap-2 rounded-full px-4"
                >
                  {workflow?.status === "ACTIVE" ? (
                    <>
                      <Play className="h-3 w-3" />
                      Active
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3" />
                      Inactive
                    </>
                  )}
                </Button>
              </div>
              <SheetDescription className="text-base text-muted-foreground">
                Configure your workflow{" "}
                {selectedNode?.type === "trigger" ? "trigger" : "action"}{" "}
                settings and customize behavior
              </SheetDescription>
            </SheetHeader>

            <Form key={selectedNode?.id ?? "none"} {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Node Name Configuration */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      Node Configuration
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Basic settings for this {selectedNode?.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Enter ${selectedNode?.type} name`}
                              className="focus-visible:ring-primary/20"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
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
                  <Card className="border-border/50 shadow-sm">
                    <Collapsible
                      open={triggerConfigOpen}
                      onOpenChange={setTriggerConfigOpen}
                    >
                      <CardHeader className="pb-3">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start p-0 hover:bg-transparent"
                          >
                            <div className="flex items-center gap-3">
                              {triggerConfigOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <CardTitle className="text-lg">
                                Trigger Configuration
                              </CardTitle>
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CardDescription className="ml-9 text-sm">
                          Configure when this workflow should run
                        </CardDescription>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-5 pt-0">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Category
                                </FormLabel>
                                <Select
                                  onValueChange={value => {
                                    field.onChange(value);
                                    // Reset trigger type when category changes
                                    form.setValue("triggerType", "");
                                    form.setValue("eventType", "");
                                  }}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="focus:ring-primary/20">
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="CRM">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        CRM
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="HR">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        HR
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="Finance">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                        Finance
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="PM">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        Project Management
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                  The module or category this trigger belongs to
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="triggerType"
                            render={({ field }) => {
                              const selectedCategory = form.watch("category");
                              const availableTriggers: TriggerOption[] =
                                selectedCategory
                                  ? (triggerMapping[selectedCategory] ?? [])
                                  : [];

                              return (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    Trigger Type
                                  </FormLabel>
                                  <Select
                                    onValueChange={value => {
                                      field.onChange(value);
                                      const selected = availableTriggers.find(
                                        t => t.value === value
                                      );
                                      form.setValue(
                                        "eventType",
                                        selected?.eventType ?? ""
                                      );
                                    }}
                                    value={field.value}
                                    disabled={!selectedCategory}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="focus:ring-primary/20">
                                        <SelectValue
                                          placeholder={
                                            selectedCategory
                                              ? "Select trigger type"
                                              : "Select a category first"
                                          }
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {availableTriggers.map(
                                        (trigger, index) => (
                                          <SelectItem
                                            key={`${trigger.value}-${index}`}
                                            value={trigger.value}
                                          >
                                            <div className="flex flex-col py-1">
                                              <span className="font-medium">
                                                {trigger.label}
                                              </span>
                                            </div>
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription className="text-xs">
                                    The specific event that will trigger this
                                    workflow
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* Action Configuration */}
                {selectedNode?.type === "action" && (
                  <Card className="border-border/50 shadow-sm">
                    <Collapsible
                      open={actionConfigOpen}
                      onOpenChange={setActionConfigOpen}
                    >
                      <CardHeader className="pb-3">
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-start p-0 hover:bg-transparent"
                          >
                            <div className="flex items-center gap-3">
                              {actionConfigOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <CardTitle className="text-lg">
                                Action Configuration
                              </CardTitle>
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CardDescription className="ml-9 text-sm">
                          Configure what action to perform
                        </CardDescription>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="space-y-5 pt-0">
                          <FormField
                            control={form.control}
                            name="actionType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Action Type
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="focus:ring-primary/20">
                                      <SelectValue placeholder="Select action type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="email">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">📧</span>
                                        <span>Send Email</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="sms">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">💬</span>
                                        <span>Send SMS</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="webhook" disabled>
                                      <div className="flex items-center gap-2 opacity-50">
                                        <span className="text-sm">🔗</span>
                                        <span>Call Webhook - Coming soon</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="slack" disabled>
                                      <div className="flex items-center gap-2 opacity-50">
                                        <span className="text-sm">🟨</span>
                                        <span>
                                          Send Slack Message - Coming soon
                                        </span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="calendar" disabled>
                                      <div className="flex items-center gap-2 opacity-50">
                                        <span className="text-sm">📅</span>
                                        <span>
                                          Create Calendar Event - Coming soon
                                        </span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
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
                                <FormLabel className="text-sm font-medium">
                                  Template
                                </FormLabel>
                                <Select
                                  onValueChange={value => {
                                    // Handle Custom value
                                    if (value === "__custom__") {
                                      field.onChange("");
                                      form.setValue("templateMode", "CUSTOM");
                                      setIsTemplateLocked(false);
                                      return;
                                    }
                                    field.onChange(value);
                                  }}
                                  value={
                                    field.value && field.value.length > 0
                                      ? field.value
                                      : "__custom__"
                                  }
                                  disabled={isLoadingTemplates}
                                >
                                  <FormControl>
                                    <SelectTrigger className="focus:ring-primary/20">
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
                                    {/* Custom option */}
                                    <SelectItem value="__custom__">
                                      <div className="flex items-center gap-2">
                                        <span>Custom</span>
                                      </div>
                                    </SelectItem>
                                    {/* Ready templates */}
                                    {(filteredTemplates ?? [])
                                      .slice(0, 2)
                                      .map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                          <div className="flex items-center gap-2">
                                            <span>{t.name}</span>
                                            {t.isLocked && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs rounded-full"
                                              >
                                                Ready
                                              </Badge>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                  Choose a ready template or switch to Custom
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("actionType") === "email" && (
                            <div className="space-y-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                              <FormField
                                control={form.control}
                                name="emailSubject"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                      <span>Email Subject</span>
                                      <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Enter email subject"
                                        className="focus-visible:ring-blue-500/20"
                                        disabled={
                                          isTemplateLocked &&
                                          form.watch("templateMode") ===
                                            "TEMPLATE"
                                        }
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      {isTemplateLocked &&
                                      form.watch("templateMode") ===
                                        "TEMPLATE" ? (
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                                          🔒 This subject is from a ready
                                          template and cannot be edited. Switch
                                          to &quot;Custom&quot; to edit.
                                        </span>
                                      ) : (
                                        "Use variables like {USER_NAME} for dynamic content"
                                      )}
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
                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                      <span>Email Body</span>
                                      <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <RichTextEditor
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        placeholder="Enter email content with rich text formatting"
                                        disabled={
                                          isTemplateLocked &&
                                          form.watch("templateMode") ===
                                            "TEMPLATE"
                                        }
                                        editorRef={emailBodyEditorRef}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      {isTemplateLocked &&
                                      form.watch("templateMode") ===
                                        "TEMPLATE" ? (
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                                          🔒 This content is from a ready
                                          template and cannot be edited. Switch
                                          to &quot;Custom&quot; to edit.
                                        </span>
                                      ) : (
                                        "Use variables like {USER_NAME} for dynamic content. You can format text using the toolbar."
                                      )}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          {form.watch("actionType") === "sms" && (
                            <div className="space-y-4 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                              <FormField
                                control={form.control}
                                name="smsBody"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                      <span>SMS Message</span>
                                      <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <RichTextEditor
                                        value={field.value ?? ""}
                                        onChange={field.onChange}
                                        placeholder="Enter SMS message content"
                                        disabled={
                                          isTemplateLocked &&
                                          form.watch("templateMode") ===
                                            "TEMPLATE"
                                        }
                                        editorRef={smsBodyEditorRef}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                      {isTemplateLocked &&
                                      form.watch("templateMode") ===
                                        "TEMPLATE" ? (
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                                          🔒 This content is from a ready
                                          template and cannot be edited. Switch
                                          to &quot;Custom&quot; to edit.
                                        </span>
                                      ) : (
                                        "Use variables like {USER_NAME} for dynamic content. Keep messages concise for SMS."
                                      )}
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )}

                {/* Variables Panel - Only show for actions */}
                {selectedNode?.type === "action" && (
                  <Card className="border-border/50 shadow-sm">
                    <Collapsible
                      open={variablesOpen}
                      onOpenChange={setVariablesOpen}
                    >
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
                              <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              <CardTitle className="text-lg">
                                Available Variables
                              </CardTitle>
                            </div>
                          </Button>
                        </CollapsibleTrigger>
                        <CardDescription className="ml-9 text-sm">
                          Click variables to insert them into text fields
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
                                      title={`Sample: ${variable.sampleValue}`}
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
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto"
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
                        createSmsActionMutation.isPending ||
                        isFetchingTrigger ||
                        isFetchingActions
                      }
                      className="w-full sm:w-auto gap-2"
                    >
                      {(createEmailActionMutation.isPending ||
                        createSmsActionMutation.isPending) && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
