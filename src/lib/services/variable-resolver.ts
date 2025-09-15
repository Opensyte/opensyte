/**
 * Variable Resolver - Resolves dynamic variables in workflow content
 */

import { type WorkflowTriggerEvent } from "../workflow-engine";
import { db } from "~/server/db";

export interface VariableContext {
  trigger: WorkflowTriggerEvent;
  organization?: { name?: string | null; [key: string]: unknown } | null;
  user?: { name?: string | null; [key: string]: unknown } | null;
  [key: string]: unknown;
}

export class VariableResolver {
  // Accept variables like {CUSTOMER_NAME}, {customer_name}, {user.name}, {email}
  private variablePattern = /\{([A-Za-z0-9_.]+)\}/g;

  /**
   * Resolve variables in text content
   */
  async resolveVariables(
    content: string,
    triggerData: WorkflowTriggerEvent,
    additionalContext?: Record<string, unknown>
  ): Promise<string> {
    if (!content) return content;

    // Build variable context
    const context = await this.buildVariableContext(
      triggerData,
      additionalContext
    );

    // Replace variables with resolved values
    return content.replace(
      this.variablePattern,
      (match, variableName: string) => {
        const value = this.resolveVariable(variableName, context);
        if (value === undefined || value === null) return match;
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return String(value);
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        try {
          return JSON.stringify(value);
        } catch {
          return match;
        }
      }
    );
  }

  /**
   * Extract all variables from content
   */
  extractVariables(content: string): string[] {
    const variables: string[] = [];
    let match;

    while ((match = this.variablePattern.exec(content)) !== null) {
      if (match[1]) {
        variables.push(match[1]);
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Get available variables for a trigger type
   */
  getAvailableVariables(
    triggerType: string,
    module: string
  ): Record<string, string> {
    const baseVariables = {
      ORGANIZATION_NAME: "Organization name",
      CURRENT_DATE: "Current date",
      CURRENT_TIME: "Current time",
      CURRENT_DATETIME: "Current date and time",
      CURRENT_USER: "Name of the user who triggered the action",
    };

    const moduleVariables: Record<string, Record<string, string>> = {
      CRM: {
        CUSTOMER_NAME: "Customer full name",
        CUSTOMER_FIRST_NAME: "Customer first name",
        CUSTOMER_LAST_NAME: "Customer last name",
        CUSTOMER_EMAIL: "Customer email address",
        CUSTOMER_PHONE: "Customer phone number",
        CUSTOMER_COMPANY: "Customer company name",
        DEAL_TITLE: "Deal title",
        DEAL_VALUE: "Deal value",
        DEAL_STATUS: "Deal status",
        DEAL_STAGE: "Deal stage",
      },
      HR: {
        EMPLOYEE_NAME: "Employee full name",
        EMPLOYEE_FIRST_NAME: "Employee first name",
        EMPLOYEE_LAST_NAME: "Employee last name",
        EMPLOYEE_EMAIL: "Employee email address",
        EMPLOYEE_PHONE: "Employee phone number",
        EMPLOYEE_POSITION: "Employee position",
        EMPLOYEE_DEPARTMENT: "Employee department",
        MANAGER_NAME: "Manager name",
        TIMEOFF_TYPE: "Time-off type",
        TIMEOFF_START_DATE: "Time-off start date",
        TIMEOFF_END_DATE: "Time-off end date",
        TIMEOFF_DURATION: "Time-off duration in days",
      },
      FINANCE: {
        INVOICE_NUMBER: "Invoice number",
        INVOICE_AMOUNT: "Invoice total amount",
        INVOICE_DUE_DATE: "Invoice due date",
        INVOICE_STATUS: "Invoice status",
        CUSTOMER_NAME: "Customer name",
        CUSTOMER_EMAIL: "Customer email",
        EXPENSE_AMOUNT: "Expense amount",
        EXPENSE_CATEGORY: "Expense category",
        EXPENSE_DESCRIPTION: "Expense description",
        PAYMENT_AMOUNT: "Payment amount",
        PAYMENT_METHOD: "Payment method",
      },
      PROJECTS: {
        PROJECT_NAME: "Project name",
        PROJECT_STATUS: "Project status",
        TASK_TITLE: "Task title",
        TASK_STATUS: "Task status",
        TASK_ASSIGNEE: "Task assignee name",
        TASK_DUE_DATE: "Task due date",
        TASK_PRIORITY: "Task priority",
      },
    };

    return {
      ...baseVariables,
      ...(moduleVariables[module.toUpperCase()] ?? {}),
    };
  }

  /**
   * Build variable context from trigger data
   */
  private async buildVariableContext(
    triggerData: WorkflowTriggerEvent,
    additionalContext?: Record<string, unknown>
  ): Promise<VariableContext> {
    const context: VariableContext = {
      trigger: triggerData,
      ...additionalContext,
    };

    // Add organization data
    if (
      triggerData.organizationId &&
      typeof triggerData.organizationId === "string"
    ) {
      const organization = await db.organization.findUnique({
        where: { id: triggerData.organizationId },
        select: { name: true, website: true, industry: true },
      });
      context.organization = organization;
    }

    // Add user data
    if (triggerData.userId) {
      try {
        const user = await db.user.findUnique({
          where: { id: triggerData.userId },
          select: { name: true, email: true },
        });
        if (user) {
          context.user = { name: user.name, email: user.email };
        } else {
          context.user = { name: "User" };
        }
      } catch {
        context.user = { name: "User" };
      }
    }

    return context;
  }

  /**
   * Resolve a single variable
   */
  private resolveVariable(
    variableName: string,
    context: VariableContext
  ): unknown {
    const { trigger, organization, user } = context;
    const payload = trigger.payload;

    const raw = variableName;
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    // System variables
    switch (upper) {
      case "ORGANIZATION_NAME":
        return organization?.name ?? "Organization";
      case "CURRENT_DATE":
        return new Date().toLocaleDateString();
      case "CURRENT_TIME":
        return new Date().toLocaleTimeString();
      case "CURRENT_DATETIME":
        return new Date().toLocaleString();
      case "CURRENT_USER":
        return user?.name ?? "System";
      case "USER_NAME":
        return user?.name ?? "System";
      case "USER_EMAIL":
        return (user as { email?: string } | undefined)?.email;
    }

    // CRM variables
    if (trigger.module.toLowerCase() === "crm") {
      switch (upper) {
        case "CUSTOMER_NAME":
          return this.getFullName(payload.firstName, payload.lastName);
        case "CUSTOMER_FIRST_NAME":
          return payload.firstName;
        case "CUSTOMER_LAST_NAME":
          return payload.lastName;
        case "CUSTOMER_EMAIL":
          return payload.email ?? payload.customerEmail;
        case "CUSTOMER_PHONE":
          return payload.phone ?? payload.customerPhone;
        case "CUSTOMER_COMPANY":
          return payload.company;
        case "DEAL_TITLE":
          return payload.title;
        case "DEAL_VALUE":
          return payload.value;
        case "DEAL_STATUS":
          return payload.status;
        case "DEAL_STAGE":
          return payload.stage;
      }
    }

    // HR variables
    if (trigger.module.toLowerCase() === "hr") {
      switch (upper) {
        case "EMPLOYEE_NAME":
          return this.getFullName(payload.firstName, payload.lastName);
        case "EMPLOYEE_FIRST_NAME":
          return payload.firstName;
        case "EMPLOYEE_LAST_NAME":
          return payload.lastName;
        case "EMPLOYEE_EMAIL":
          return payload.email;
        case "EMPLOYEE_PHONE":
          return payload.phone;
        case "EMPLOYEE_POSITION":
          return payload.position;
        case "EMPLOYEE_DEPARTMENT":
          return payload.department;
        case "MANAGER_NAME":
          return payload.managerName;
        case "TIMEOFF_TYPE":
          return payload.type;
        case "TIMEOFF_START_DATE":
          return payload.startDate
            ? new Date(payload.startDate as string).toLocaleDateString()
            : "";
        case "TIMEOFF_END_DATE":
          return payload.endDate
            ? new Date(payload.endDate as string).toLocaleDateString()
            : "";
        case "TIMEOFF_DURATION":
          return payload.duration;
      }
    }

    // Finance variables
    if (trigger.module.toLowerCase() === "finance") {
      switch (upper) {
        case "INVOICE_NUMBER":
          return payload.invoiceNumber;
        case "INVOICE_AMOUNT":
          return payload.totalAmount ?? payload.amount;
        case "INVOICE_DUE_DATE":
          return payload.dueDate
            ? new Date(payload.dueDate as string).toLocaleDateString()
            : "";
        case "INVOICE_STATUS":
          return payload.status;
        case "CUSTOMER_NAME":
          return (
            payload.customerName ??
            this.getFullName(payload.firstName, payload.lastName)
          );
        case "CUSTOMER_EMAIL":
          return payload.customerEmail ?? payload.email;
        case "EXPENSE_AMOUNT":
          return payload.amount;
        case "EXPENSE_CATEGORY":
          return payload.category ?? payload.categoryName;
        case "EXPENSE_DESCRIPTION":
          return payload.description;
        case "PAYMENT_AMOUNT":
          return payload.amount;
        case "PAYMENT_METHOD":
          return payload.method;
      }
    }

    // Project variables
    if (trigger.module.toLowerCase() === "projects") {
      switch (upper) {
        case "PROJECT_NAME":
          return payload.name ?? payload.projectName;
        case "PROJECT_STATUS":
          return payload.status ?? payload.projectStatus;
        case "TASK_TITLE":
          return payload.title ?? payload.taskTitle;
        case "TASK_STATUS":
          return payload.status ?? payload.taskStatus;
        case "TASK_ASSIGNEE":
          return payload.assigneeName ?? payload.assignee;
        case "TASK_DUE_DATE":
          return payload.dueDate
            ? new Date(payload.dueDate as string).toLocaleDateString()
            : "";
        case "TASK_PRIORITY":
          return payload.priority;
      }
    }

    // Aliases: snake_case to object paths (e.g., user_name -> user.name)
    const aliasValue = this.resolveSnakeCaseAlias(lower, {
      payload,
      user,
      organization,
    });
    if (aliasValue !== undefined) return aliasValue;

    // Dot notation: user.name, customer.email, organization.name, payload.email
    const dotValue = this.getByPath(
      { payload, user, organization, trigger },
      lower
    );
    if (dotValue !== undefined) return dotValue;

    // Fallback: direct payload lookup (case-insensitive)
    const lowerVariableName = lower;
    const payloadValue =
      this.getCaseInsensitive(payload, lowerVariableName) ??
      payload[variableName];

    if (payloadValue !== undefined) {
      return payloadValue;
    }

    // Try nested object access
    for (const [, value] of Object.entries(payload)) {
      if (typeof value === "object" && value !== null) {
        const nestedValue =
          (value as Record<string, unknown>)[lowerVariableName] ??
          (value as Record<string, unknown>)[variableName];
        if (nestedValue !== undefined) {
          return nestedValue;
        }
      }
    }

    return undefined;
  }

  /**
   * Helper to create full name from first and last name
   */
  private getFullName(firstName?: unknown, lastName?: unknown): string {
    const first = typeof firstName === "string" ? firstName : "";
    const last = typeof lastName === "string" ? lastName : "";
    return [first, last].filter(Boolean).join(" ") || "Unknown";
  }

  // Helpers
  private resolveSnakeCaseAlias(
    lowerVar: string,
    ctx: {
      payload: Record<string, unknown>;
      user?: Record<string, unknown> | null;
      organization?: Record<string, unknown> | null;
    }
  ): unknown {
    // Map e.g., user_name -> user.name, customer_email -> payload.customerEmail
    if (lowerVar.includes("_")) {
      const [prefix, ...rest] = lowerVar.split("_");
      const tail = rest.join("_");
      if (prefix === "user" && tail === "name") return ctx.user?.name;
      if (prefix === "user" && tail === "email")
        return (ctx.user as { email?: string } | undefined)?.email;
      if ((prefix === "customer" || prefix === "contact") && tail === "name")
        return this.getFullName(ctx.payload.firstName, ctx.payload.lastName);
      if ((prefix === "customer" || prefix === "contact") && tail === "email")
        return ctx.payload.customerEmail ?? ctx.payload.email;
      if ((prefix === "customer" || prefix === "contact") && tail === "phone")
        return ctx.payload.customerPhone ?? ctx.payload.phone;
      if (prefix === "organization" && tail === "name")
        return ctx.organization?.name;
    }
    return undefined;
  }

  private getCaseInsensitive(
    obj: Record<string, unknown>,
    keyLower: string
  ): unknown {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === keyLower) return obj[k];
    }
    return undefined;
  }

  private getByPath(obj: Record<string, unknown>, pathLower: string): unknown {
    if (!pathLower.includes(".")) return undefined;
    const parts = pathLower.split(".");
    let cur: unknown = obj;
    for (const part of parts) {
      if (typeof cur !== "object" || cur === null) return undefined;
      const curObj = cur as Record<string, unknown>;
      // find key case-insensitively
      const key = Object.keys(curObj).find(k => k.toLowerCase() === part);
      if (!key) return undefined;
      cur = curObj[key];
    }
    return cur;
  }

  /**
   * Validate variables in content against available variables
   */
  validateVariables(
    content: string,
    triggerType: string,
    module: string
  ): { valid: boolean; invalidVariables: string[] } {
    const usedVariables = this.extractVariables(content);
    const availableVariables = this.getAvailableVariables(triggerType, module);
    const invalidVariables = usedVariables.filter(
      variable => !(variable in availableVariables)
    );

    return {
      valid: invalidVariables.length === 0,
      invalidVariables,
    };
  }
}
