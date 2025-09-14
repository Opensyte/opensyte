import type { Prisma } from "@prisma/client";

// System template type definition
export interface SystemTemplate {
  id: string;
  name: string;
  description: string;
  category: "COMMUNICATION" | "AUTOMATION" | "NOTIFICATION";
  type: "EMAIL" | "SMS" | "WHATSAPP" | "SLACK" | "CALENDAR" | "WEBHOOK";
  isActive: boolean;
  isLocked: boolean;
  requiredVariables: string[];
  optionalVariables: string[];
  template: {
    email?: {
      subject: string;
      html: string;
    };
    sms?: {
      message: string;
    };
  };
}

// System templates configuration
export const SYSTEM_TEMPLATES: readonly SystemTemplate[] = [
  {
    id: "sys_tpl_email_welcome",
    name: "Welcome Email",
    description: "Greets a new user and introduces your organization",
    category: "COMMUNICATION",
    type: "EMAIL",
    isActive: true,
    isLocked: true,
    requiredVariables: ["USER_NAME", "ORGANIZATION_NAME"],
    optionalVariables: [],
    template: {
      email: {
        subject: "Welcome to {ORGANIZATION_NAME}",
        html: "<h2>Hi {USER_NAME},</h2><p>Welcome to {ORGANIZATION_NAME}! We're excited to have you.</p>",
      },
    },
  },
  {
    id: "sys_tpl_email_invoice_reminder",
    name: "Invoice Reminder Email",
    description: "Reminds customers about open invoices",
    category: "COMMUNICATION",
    type: "EMAIL",
    isActive: true,
    isLocked: true,
    requiredVariables: ["CUSTOMER_NAME", "INVOICE_NUMBER"],
    optionalVariables: [],
    template: {
      email: {
        subject: "Invoice Reminder #{INVOICE_NUMBER}",
        html: "<p>Dear {CUSTOMER_NAME},</p><p>This is a friendly reminder for invoice #{INVOICE_NUMBER}.</p>",
      },
    },
  },
  {
    id: "sys_tpl_sms_reminder",
    name: "Reminder SMS",
    description: "Simple reminder via SMS",
    category: "COMMUNICATION",
    type: "SMS",
    isActive: true,
    isLocked: true,
    requiredVariables: ["CUSTOMER_NAME", "INVOICE_NUMBER"],
    optionalVariables: [],
    template: {
      sms: {
        message:
          "Hi {CUSTOMER_NAME}, this is a reminder about invoice {INVOICE_NUMBER}.",
      },
    },
  },
  {
    id: "sys_tpl_sms_followup",
    name: "Follow-up SMS",
    description: "Friendly follow-up via SMS",
    category: "COMMUNICATION",
    type: "SMS",
    isActive: true,
    isLocked: true,
    requiredVariables: ["USER_NAME", "ORGANIZATION_NAME"],
    optionalVariables: [],
    template: {
      sms: {
        message: "Hello {USER_NAME}, just checking in. – {ORGANIZATION_NAME}",
      },
    },
  },
] as const;

// Utility functions for system templates
export class SystemTemplateService {
  /**
   * Find a system template by ID
   */
  static findById(templateId: string): SystemTemplate | undefined {
    return SYSTEM_TEMPLATES.find(template => template.id === templateId);
  }

  /**
   * Check if a template ID is a system template
   */
  static isSystemTemplate(templateId: string): boolean {
    return templateId.startsWith("sys_tpl_");
  }

  /**
   * Get system templates by type
   */
  static getByType(type: SystemTemplate["type"]): SystemTemplate[] {
    return SYSTEM_TEMPLATES.filter(template => template.type === type);
  }

  /**
   * Get system templates by category
   */
  static getByCategory(category: SystemTemplate["category"]): SystemTemplate[] {
    return SYSTEM_TEMPLATES.filter(template => template.category === category);
  }

  /**
   * Convert system template to API response format
   */
  static toApiResponse(template: SystemTemplate) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      type: template.type,
      isActive: template.isActive,
      isLocked: template.isLocked,
      requiredVariables: template.requiredVariables,
      optionalVariables: template.optionalVariables,
    };
  }

  /**
   * Convert system template to full template response format
   */
  static toFullTemplateResponse(template: SystemTemplate) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      type: template.type,
      template: template.template as unknown as Prisma.InputJsonValue,
      defaultConfig: {},
      schema: {},
      version: "1.0.0",
      isPublic: true,
      isActive: template.isActive,
      isLocked: template.isLocked,
      usageCount: 0,
      requiredVariables:
        template.requiredVariables as unknown as Prisma.InputJsonValue,
      optionalVariables:
        template.optionalVariables as unknown as Prisma.InputJsonValue,
      createdById: null as string | null,
      createdAt: new Date(),
      updatedAt: new Date(),
      versions: [],
    };
  }

  /**
   * Get all system templates for API response
   */
  static getAllForApi() {
    return SYSTEM_TEMPLATES.map(template => this.toApiResponse(template));
  }

  /**
   * Validate that required variables are present in content
   */
  static validateRequiredVariables(
    template: SystemTemplate,
    content: string
  ): { isValid: boolean; missingVariables: string[] } {
    const missingVariables = template.requiredVariables.filter(variable => {
      const placeholder = `{${variable}}`;
      return !content.includes(placeholder);
    });

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Extract variables from template content
   */
  static extractVariablesFromContent(content: string): string[] {
    const variableRegex = /\{([A-Z_]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1]!)) {
        variables.push(match[1]!);
      }
    }

    return variables;
  }
}
