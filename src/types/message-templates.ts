import { z } from "zod";
import type { SystemTemplate } from "~/lib/system-templates";

// Template type definitions
export type EmailTemplate = {
  email: {
    subject: string;
    html: string;
  };
};

export type SmsTemplate = {
  sms: {
    message: string;
  };
};

// Message template types based on action templates
export type MessageChannel = "EMAIL" | "SMS";
export type MessageTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// Input schemas for message template creation using action templates
export const createMessageTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  type: z.enum(["EMAIL", "SMS"]),
  template: z
    .object({
      email: z
        .object({
          subject: z.string().min(1, "Subject is required"),
          html: z.string().min(1, "HTML content is required"),
        })
        .optional(),
      sms: z
        .object({
          message: z.string().min(1, "Message is required"),
        })
        .optional(),
    })
    .refine(data => {
      // Ensure the correct template type is provided
      return (data.email && !data.sms) ?? (!data.email && data.sms);
    }, "Must provide either email or SMS template data"),
  requiredVariables: z.array(z.string()).default([]),
  optionalVariables: z.array(z.string()).default([]),
});

export const updateMessageTemplateSchema = createMessageTemplateSchema
  .partial()
  .extend({
    templateId: z.string(),
  });

// Query schemas
export const getMessageTemplatesSchema = z.object({
  organizationId: z.string().cuid(),
  type: z.enum(["EMAIL", "SMS"]).optional(),
});

export const getMessageTemplateSchema = z.object({
  templateId: z.string(),
  organizationId: z.string().cuid(),
});

// Preview schema
export const previewMessageTemplateSchema = z.object({
  templateId: z.string(),
  organizationId: z.string().cuid(),
  sampleData: z.record(z.unknown()).optional().default({}),
});

// Types for frontend
export type CreateMessageTemplateInput = z.infer<
  typeof createMessageTemplateSchema
>;
export type UpdateMessageTemplateInput = z.infer<
  typeof updateMessageTemplateSchema
>;
export type GetMessageTemplatesInput = z.infer<
  typeof getMessageTemplatesSchema
>;
export type PreviewMessageTemplateInput = z.infer<
  typeof previewMessageTemplateSchema
>;

// Message template with action template data
export interface MessageTemplateData {
  id: string;
  name: string;
  description?: string;
  type: MessageChannel;
  template: {
    email?: {
      subject: string;
      html: string;
    };
    sms?: {
      message: string;
    };
  };
  requiredVariables: string[];
  optionalVariables: string[];
  isActive: boolean;
  isLocked: boolean;
  usageCount: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// List response type
export type MessageTemplateListResponse = {
  templates: MessageTemplateData[];
  systemTemplates: SystemTemplate[];
};

// Preview response type
export type MessageTemplatePreviewResponse = {
  rendered: {
    subject?: string;
    html?: string;
    message?: string;
  };
  variables: string[];
  warnings: string[];
};

// SMS character analysis
export type SmsAnalysis = {
  characterCount: number;
  segmentCount: number;
  encoding: "GSM" | "Unicode";
  maxSingleSegment: number;
  isOverLimit: boolean;
};

// Helper function to get templates for picker
export interface MessageTemplatePickerOption {
  id: string;
  name: string;
  type: MessageChannel;
  description?: string;
  isSystem: boolean;
}
