import { TRPCError } from "@trpc/server";
import { SystemTemplateService } from "./system-templates";
import { db } from "~/server/db";

export interface ResolvedTemplate {
  id: string;
  name: string;
  isLocked: boolean;
  content: {
    subject?: string;
    htmlBody?: string;
    message?: string;
  };
  requiredVariables: string[];
  optionalVariables: string[];
}

/**
 * Service for resolving templates from both system and database sources
 */
export class TemplateResolver {
  /**
   * Resolve a template by ID from system templates or database
   */
  static async resolveTemplate(
    templateId: string,
    organizationId: string
  ): Promise<ResolvedTemplate> {
    // Check system templates first
    if (SystemTemplateService.isSystemTemplate(templateId)) {
      const systemTemplate = SystemTemplateService.findById(templateId);
      if (!systemTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "System template not found",
        });
      }

      return {
        id: systemTemplate.id,
        name: systemTemplate.name,
        isLocked: systemTemplate.isLocked,
        content: {
          subject: systemTemplate.template.email?.subject,
          htmlBody: systemTemplate.template.email?.html,
          message: systemTemplate.template.sms?.message,
        },
        requiredVariables: systemTemplate.requiredVariables,
        optionalVariables: systemTemplate.optionalVariables,
      };
    }

    // Check database templates
    const dbTemplate = await db.actionTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ organizationId }, { isPublic: true }],
      },
    });

    if (!dbTemplate) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found",
      });
    }

    // Extract content from database template
    const templateData = dbTemplate.template as Record<string, unknown>;
    const emailData = templateData?.email as Record<string, string> | undefined;
    const smsData = templateData?.sms as Record<string, string> | undefined;

    const content = {
      subject: emailData?.subject,
      htmlBody: emailData?.html ?? emailData?.htmlBody,
      message: smsData?.message,
    };

    return {
      id: dbTemplate.id,
      name: dbTemplate.name,
      isLocked: Boolean(dbTemplate.isLocked),
      content,
      requiredVariables: Array.isArray(dbTemplate.requiredVariables)
        ? (dbTemplate.requiredVariables as string[])
        : [],
      optionalVariables: Array.isArray(dbTemplate.optionalVariables)
        ? (dbTemplate.optionalVariables as string[])
        : [],
    };
  }

  /**
   * Validate template content based on mode and template lock status
   */
  static validateTemplateContent(
    templateMode: "TEMPLATE" | "CUSTOM",
    template: ResolvedTemplate | null,
    providedContent: {
      subject?: string;
      htmlBody?: string;
      message?: string;
    }
  ): {
    finalContent: {
      subject?: string;
      htmlBody?: string;
      message?: string;
    };
    templateId?: string;
  } {
    if (templateMode === "TEMPLATE") {
      if (!template) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Template is required when templateMode is TEMPLATE",
        });
      }

      if (template.isLocked) {
        // Use template content, ignore provided overrides
        return {
          finalContent: template.content,
          templateId: template.id,
        };
      } else {
        // Allow overrides for unlocked templates
        return {
          finalContent: {
            subject: providedContent.subject ?? template.content.subject,
            htmlBody: providedContent.htmlBody ?? template.content.htmlBody,
            message: providedContent.message ?? template.content.message,
          },
          templateId: template.id,
        };
      }
    } else {
      // CUSTOM mode - require content to be provided
      const hasRequiredContent =
        providedContent.subject ??
        providedContent.htmlBody ??
        providedContent.message;

      if (!hasRequiredContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Content is required when templateMode is CUSTOM",
        });
      }

      return {
        finalContent: providedContent,
        templateId: undefined,
      };
    }
  }

  /**
   * Process template for email action
   */
  static async processEmailTemplate(
    templateMode: "TEMPLATE" | "CUSTOM",
    templateId: string | undefined,
    organizationId: string,
    providedContent: {
      subject?: string;
      htmlBody?: string;
    }
  ) {
    let template: ResolvedTemplate | null = null;

    if (templateMode === "TEMPLATE" && templateId) {
      template = await this.resolveTemplate(templateId, organizationId);
    }

    return this.validateTemplateContent(
      templateMode,
      template,
      providedContent
    );
  }

  /**
   * Process template for SMS action
   */
  static async processSmsTemplate(
    templateMode: "TEMPLATE" | "CUSTOM",
    templateId: string | undefined,
    organizationId: string,
    providedContent: {
      message?: string;
    }
  ) {
    let template: ResolvedTemplate | null = null;

    if (templateMode === "TEMPLATE" && templateId) {
      template = await this.resolveTemplate(templateId, organizationId);
    }

    return this.validateTemplateContent(
      templateMode,
      template,
      providedContent
    );
  }
}
