import {
  WorkflowExecutionStatus,
  CustomerType,
  LeadStatus,
  ProjectStatus,
  TaskStatus,
  Priority,
  InvoiceStatus,
  Prisma,
} from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  PREBUILT_WORKFLOWS,
  type PrebuiltWorkflowDefinition,
  type PrebuiltWorkflowKey,
} from "./definitions";
import type { WorkflowTriggerEvent } from "~/lib/workflow-engine";
import { db as defaultDb } from "~/server/db";
import { EmailService } from "~/lib/services/email-service";
import type { EmailResult } from "~/lib/services/email-service";

const templateTokenPattern = /{{\s*([A-Za-z0-9_.-]+)\s*}}/g;

export interface PrebuiltWorkflowExecutionSummary {
  workflowKey: PrebuiltWorkflowKey;
  matched: boolean;
  executed: boolean;
  success: boolean;
  runId?: string;
  error?: string;
}

interface WorkflowConfigState {
  enabled: boolean;
  emailSubject: string;
  emailBody: string;
  persistedConfig?: PrebuiltWorkflowConfigRecord | null;
}

interface ExecutionDependencies {
  db?: PrismaClient;
  emailService?: EmailService;
  appUrl?: string;
}

interface ExecutionContext {
  event: WorkflowTriggerEvent;
  definition: PrebuiltWorkflowDefinition;
  config: WorkflowConfigState;
  db: PrismaClient;
  emailService: EmailService;
  appUrl: string;
  organizationName: string;
  triggeringUser?: { name?: string | null; email?: string | null } | null;
}

interface HandlerResult {
  recipient?: string;
  subject?: string;
  email?: EmailResult;
  details?: Record<string, unknown>;
}

interface CustomerPromotionResult {
  customerId: string;
  previousType?: CustomerType | null;
  wasUpdated: boolean;
}

interface ProjectProvisionResult {
  projectId: string;
  created: boolean;
  taskSeedCount?: number;
}

interface RenewalInvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  created: boolean;
  amount?: Prisma.Decimal;
  dueDate?: Date | null;
  status?: InvoiceStatus;
  currency?: string;
}

interface OperationsSnapshot {
  activeProjectCount: number;
  projectsAtRiskCount: number;
  overdueInvoiceCount: number;
  activeClientCount: number;
  overdueTaskCount: number;
}

type PrebuiltWorkflowHandler = {
  key: PrebuiltWorkflowKey;
  matches(event: WorkflowTriggerEvent): boolean;
  execute(context: ExecutionContext): Promise<HandlerResult>;
};

interface PrebuiltWorkflowConfigRecord {
  id: string;
  organizationId: string;
  workflowKey: PrebuiltWorkflowKey;
  enabled: boolean;
  emailSubject: string;
  emailBody: string;
  templateVersion: number;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PrebuiltWorkflowConfigDelegate {
  findMany(args: {
    where: { organizationId: string };
  }): Promise<PrebuiltWorkflowConfigRecord[]>;
}

interface PrebuiltWorkflowRunRecord {
  id: string;
}

interface PrebuiltWorkflowRunDelegate {
  create(args: {
    data: Record<string, unknown>;
  }): Promise<PrebuiltWorkflowRunRecord>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<PrebuiltWorkflowRunRecord>;
}

function getPrebuiltWorkflowConfigDelegate(
  prisma: PrismaClient
): PrebuiltWorkflowConfigDelegate {
  return (
    prisma as unknown as {
      prebuiltWorkflowConfig: PrebuiltWorkflowConfigDelegate;
    }
  ).prebuiltWorkflowConfig;
}

function getPrebuiltWorkflowRunDelegate(
  prisma: PrismaClient
): PrebuiltWorkflowRunDelegate {
  return (
    prisma as unknown as { prebuiltWorkflowRun: PrebuiltWorkflowRunDelegate }
  ).prebuiltWorkflowRun;
}

const defaultAppUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.opensyte.com";

export class PrebuiltWorkflowExecutor {
  private readonly db: PrismaClient;
  private readonly emailService: EmailService;
  private readonly appUrl: string;

  constructor(deps: ExecutionDependencies = {}) {
    this.db = deps.db ?? defaultDb;
    this.emailService = deps.emailService ?? new EmailService();
    this.appUrl = deps.appUrl ?? defaultAppUrl;
  }

  async execute(
    event: WorkflowTriggerEvent
  ): Promise<PrebuiltWorkflowExecutionSummary[]> {
    const summaries: PrebuiltWorkflowExecutionSummary[] = [];

    console.log("[PrebuiltWorkflowExecutor] Evaluating event:", {
      module: event.module,
      entityType: event.entityType,
      eventType: event.eventType,
      payload: event.payload,
    });

    const handlers = HANDLERS.filter(handler => handler.matches(event));
    console.log(
      `[PrebuiltWorkflowExecutor] Matched ${handlers.length} handler(s):`,
      handlers.map(h => h.key)
    );

    if (handlers.length === 0) {
      return summaries;
    }

    const definitionMap = new Map<
      PrebuiltWorkflowKey,
      PrebuiltWorkflowDefinition
    >(PREBUILT_WORKFLOWS.map(definition => [definition.key, definition]));

    const configDelegate = getPrebuiltWorkflowConfigDelegate(this.db);
    const runDelegate = getPrebuiltWorkflowRunDelegate(this.db);

    const configs = await configDelegate.findMany({
      where: { organizationId: event.organizationId },
    });
    const configMap = new Map<
      PrebuiltWorkflowKey,
      PrebuiltWorkflowConfigRecord
    >(configs.map(config => [config.workflowKey, config]));

    const organizationName = await this.fetchOrganizationName(
      event.organizationId
    );
    const triggeringUser = event.userId
      ? await this.fetchTriggeringUser(event.userId)
      : null;

    for (const handler of handlers) {
      const definition = definitionMap.get(handler.key);
      if (!definition) {
        summaries.push({
          workflowKey: handler.key,
          matched: true,
          executed: false,
          success: false,
          error: "Workflow definition not found",
        });
        continue;
      }

      const storedConfig = configMap.get(handler.key);
      const config: WorkflowConfigState = {
        enabled: storedConfig?.enabled ?? false,
        emailSubject:
          storedConfig?.emailSubject ?? definition.emailDefaults.subject,
        emailBody: storedConfig?.emailBody ?? definition.emailDefaults.body,
        persistedConfig: storedConfig,
      };

      console.log(`[PrebuiltWorkflowExecutor] Workflow "${handler.key}":`, {
        enabled: config.enabled,
        hasConfig: !!storedConfig,
      });

      if (!config.enabled) {
        console.log(
          `[PrebuiltWorkflowExecutor] Skipping disabled workflow: ${handler.key}`
        );
        summaries.push({
          workflowKey: handler.key,
          matched: true,
          executed: false,
          success: false,
          error: "Workflow disabled",
        });
        continue;
      }

      const runRecord = await this.createRunRecord(
        handler.key,
        event,
        organizationName,
        runDelegate
      );

      const runStartedAt = Date.now();

      try {
        console.log(
          `[PrebuiltWorkflowExecutor] Executing workflow: ${handler.key}`
        );
        const context: ExecutionContext = {
          event,
          definition,
          config,
          db: this.db,
          emailService: this.emailService,
          appUrl: this.appUrl,
          organizationName,
          triggeringUser,
        };

        const result = await handler.execute(context);
        console.log(
          `[PrebuiltWorkflowExecutor] Workflow "${handler.key}" completed:`,
          result
        );
        const durationMs = Date.now() - runStartedAt;

        await runDelegate.update({
          where: { id: runRecord.id },
          data: {
            status: WorkflowExecutionStatus.COMPLETED,
            completedAt: new Date(),
            durationMs,
            emailRecipient: result.recipient,
            emailSubject: result.subject,
            result: (result.details ?? undefined) as Prisma.InputJsonValue,
          },
        });

        summaries.push({
          workflowKey: handler.key,
          matched: true,
          executed: true,
          success: true,
          runId: runRecord.id,
        });
      } catch (error) {
        const durationMs = Date.now() - runStartedAt;
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[PrebuiltWorkflowExecutor] Workflow "${handler.key}" failed:`,
          error
        );

        await runDelegate.update({
          where: { id: runRecord.id },
          data: {
            status: WorkflowExecutionStatus.FAILED,
            completedAt: new Date(),
            durationMs,
            error: message,
          },
        });

        summaries.push({
          workflowKey: handler.key,
          matched: true,
          executed: true,
          success: false,
          runId: runRecord.id,
          error: message,
        });
      }
    }

    return summaries;
  }

  private async fetchOrganizationName(organizationId: string): Promise<string> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    return organization?.name ?? "Your organization";
  }

  private async fetchTriggeringUser(userId: string) {
    return await this.db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
  }

  private async createRunRecord(
    workflowKey: PrebuiltWorkflowKey,
    event: WorkflowTriggerEvent,
    organizationName: string,
    runDelegate: PrebuiltWorkflowRunDelegate
  ): Promise<PrebuiltWorkflowRunRecord> {
    return await runDelegate.create({
      data: {
        organizationId: event.organizationId,
        workflowKey,
        status: WorkflowExecutionStatus.RUNNING,
        triggerModule: event.module,
        triggerEntity: event.entityType,
        triggerEvent: event.eventType,
        triggeredAt: event.triggeredAt ?? new Date(),
        context: {
          organizationName,
          payload: event.payload,
          userId: event.userId,
        } as Prisma.InputJsonValue,
      },
    });
  }
}

const leadToClientHandler: PrebuiltWorkflowHandler = {
  key: "lead-to-client",
  matches: event => {
    if (event.module.toLowerCase() !== "crm") {
      return false;
    }

    const entity = event.entityType.toLowerCase();
    const normalizedEventType = event.eventType.toLowerCase();
    const payload = event.payload ?? {};

    let statusCandidate: string | undefined;

    if (entity === "deal") {
      if (
        !(
          normalizedEventType === "status_changed" ||
          normalizedEventType === "converted"
        )
      ) {
        return false;
      }

      statusCandidate =
        extractString(payload.status) ??
        extractString(payload.newStatus) ??
        extractString(payload.stage) ??
        extractString(payload.pipelineStatus);
    } else if (entity === "contact") {
      if (
        !(
          normalizedEventType === "created" ||
          normalizedEventType === "updated" ||
          normalizedEventType === "status_changed"
        )
      ) {
        return false;
      }

      statusCandidate =
        extractString(payload.status) ??
        extractString(payload.newStatus) ??
        extractString(payload.stage) ??
        extractString(payload.pipelineStatus);
    } else {
      return false;
    }

    if (!statusCandidate) {
      return false;
    }

    const normalizedStatus = statusCandidate.toUpperCase();
    return (
      normalizedStatus === LeadStatus.QUALIFIED ||
      normalizedStatus === LeadStatus.CLOSED_WON ||
      normalizedStatus === "CLIENT" ||
      normalizedStatus === "CUSTOMER"
    );
  },
  async execute(context) {
    const {
      event,
      definition,
      config,
      db,
      organizationName,
      emailService,
      appUrl,
      triggeringUser,
    } = context;

    const payload = event.payload ?? {};
    const customerId =
      extractString(payload.customerId) ??
      extractString(payload.clientId) ??
      extractString(payload.contactId) ??
      extractString(payload.id);

    if (!customerId) {
      throw new Error("Lead conversion event missing customerId");
    }

    const promotion = await promoteCustomerToClient({
      db,
      organizationId: event.organizationId,
      customerId,
    });

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true,
      },
    });

    if (!customer) {
      throw new Error("Converted customer record not found");
    }

    const customerDisplayName =
      ([customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
        customer.company) ??
      "Client";

    const project = await ensureOnboardingProject({
      db,
      organizationId: event.organizationId,
      customerId,
      projectName:
        extractString(payload.projectName) ??
        `${customerDisplayName} - Onboarding`,
      startDate:
        extractDate(payload.projectStartDate) ?? extractDate(payload.startDate),
      createdById: event.userId,
      dealValue: payload.value,
      currency: extractString(payload.currency),
      description:
        extractString(payload.summary) ?? extractString(payload.notes),
    });

    const recipient =
      extractString(customer.email) ?? extractString(payload.customerEmail);

    const variables = buildLeadToClientVariables({
      organizationName,
      customer,
      projectLink: `${appUrl}/projects/${project.projectId}`,
      projectFolderLink:
        extractString(payload.projectFolderLink) ??
        `${appUrl}/projects/${project.projectId}/files`,
      accountManagerName:
        triggeringUser?.name ??
        extractString(payload.ownerName) ??
        extractString(payload.accountManagerName) ??
        "Your team",
      accountManagerEmail:
        triggeringUser?.email ??
        extractString(payload.ownerEmail) ??
        extractString(payload.accountManagerEmail) ??
        "",
    });

    const subject = renderTemplate(config.emailSubject, variables);
    const body = renderTemplate(config.emailBody, variables);

    let emailResult: EmailResult | undefined;
    if (recipient) {
      emailResult = await emailService.sendEmail({
        to: recipient,
        subject,
        htmlBody: convertToHtml(body),
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error ?? "Failed to send conversion email");
      }
    }

    return {
      recipient,
      subject,
      email: emailResult,
      details: {
        workflow: definition.key,
        promotion,
        project,
      },
    } satisfies HandlerResult;
  },
};

const projectLifecycleHandler: PrebuiltWorkflowHandler = {
  key: "project-lifecycle",
  matches: event => {
    if (event.module.toLowerCase() !== "projects") {
      return false;
    }
    if (event.entityType.toLowerCase() !== "project") {
      return false;
    }

    const normalizedEventType = event.eventType.toLowerCase();
    if (normalizedEventType === "created") {
      return true;
    }

    if (normalizedEventType === "status_changed") {
      const statusCandidate =
        extractString(event.payload.status) ??
        extractString(event.payload.newStatus);
      return statusCandidate?.toUpperCase() === ProjectStatus.COMPLETED;
    }

    return false;
  },
  async execute(context) {
    const {
      event,
      definition,
      config,
      db,
      emailService,
      organizationName,
      appUrl,
      triggeringUser,
    } = context;

    const payload = event.payload ?? {};
    const projectId =
      extractString(payload.projectId) ?? extractString(payload.id);

    if (!projectId) {
      throw new Error("Project lifecycle event missing projectId");
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project lifecycle could not load project");
    }

    let seededTaskCount = 0;

    if (event.eventType.toLowerCase() === "created") {
      seededTaskCount = await seedOnboardingTasks({
        db,
        organizationId: project.organizationId,
        projectId: project.id,
        ownerId: project.createdById,
      });

      await ensureProjectOwnerResource({
        db,
        projectId: project.id,
        assigneeId: project.createdById,
      });
    }

    const normalizedStatus = (
      extractString(payload.status) ??
      extractString(payload.newStatus) ??
      project.status
    )
      ?.toString()
      .toUpperCase();

    if (normalizedStatus === ProjectStatus.COMPLETED) {
      if (!project.endDate) {
        await db.project.update({
          where: { id: project.id },
          data: {
            endDate: new Date(),
            status: ProjectStatus.COMPLETED,
          },
        });
      }
    }

    const customerEmail =
      project.customer && "email" in project.customer
        ? (project.customer as { email?: unknown }).email
        : undefined;

    const payloadCustomerId =
      extractString(payload.customerId) ??
      extractString(payload.clientId) ??
      extractString(payload.contactId);

    let resolvedCustomer = project.customer ?? null;
    if (!resolvedCustomer && payloadCustomerId) {
      resolvedCustomer = await db.customer.findUnique({
        where: { id: payloadCustomerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          email: true,
        },
      });
    }

    const recipient =
      extractString(customerEmail) ??
      extractString(resolvedCustomer?.email) ??
      extractString(payload.customerEmail) ??
      extractString(payload.primaryContactEmail) ??
      extractFirstEmail(payload.customerEmails) ??
      extractString(triggeringUser?.email);

    console.log(
      `[Project Lifecycle] Project ${project.id}, recipient: ${recipient ?? "none"}, has customer: ${!!resolvedCustomer}`
    );

    if (!recipient) {
      console.log(
        `[Project Lifecycle] Skipping email - no customer email for project ${project.id}`
      );
      return {
        details: {
          workflow: definition.key,
          projectId: project.id,
          seededTaskCount,
          skippedNotification: true,
          reason: "No customer email available",
        },
      } satisfies HandlerResult;
    }

    const variables = buildProjectLifecycleVariables({
      organizationName,
      project,
      payload,
      appUrl,
      triggeringUser,
    });

    const subject = renderTemplate(config.emailSubject, variables);
    const body = renderTemplate(config.emailBody, variables);

    console.log(
      `[Project Lifecycle] Sending email to ${recipient} with subject: ${subject}`
    );

    const emailResult = await emailService.sendEmail({
      to: recipient,
      subject,
      htmlBody: convertToHtml(body),
    });

    if (!emailResult.success) {
      console.error(
        `[Project Lifecycle] Email send failed: ${emailResult.error}`
      );
      throw new Error(
        emailResult.error ?? "Failed to send project update email"
      );
    }

    console.log(
      `[Project Lifecycle] Email sent successfully, messageId: ${emailResult.messageId}`
    );

    return {
      recipient,
      subject,
      email: emailResult,
      details: {
        workflow: definition.key,
        projectId: project.id,
        seededTaskCount,
        status: normalizedStatus,
        emailSent: true,
      },
    } satisfies HandlerResult;
  },
};

const invoiceTrackingHandler: PrebuiltWorkflowHandler = {
  key: "invoice-tracking",
  matches: event => {
    // Listen for project completion events
    if (event.module.toLowerCase() !== "projects") {
      return false;
    }
    if (event.entityType.toLowerCase() !== "project") {
      return false;
    }

    const normalizedEventType = event.eventType.toLowerCase();
    if (normalizedEventType !== "status_changed") {
      return false;
    }

    // Check if project was marked as completed
    const statusCandidate =
      extractString(event.payload.status) ??
      extractString(event.payload.newStatus);

    return statusCandidate?.toUpperCase() === ProjectStatus.COMPLETED;
  },
  async execute(context) {
    const {
      event,
      definition,
      config,
      emailService,
      organizationName,
      appUrl,
      db,
      triggeringUser,
    } = context;

    const payload = event.payload ?? {};
    const projectId =
      extractString(payload.id) ?? extractString(payload.projectId);

    if (!projectId) {
      throw new Error("Invoice tracking workflow requires a project ID");
    }

    console.log(
      `[Invoice Tracking] Evaluating project ${projectId} for organization ${event.organizationId}`
    );

    // Load the completed project details
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            address: true,
            phone: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error("Project not found for invoice generation");
    }

    const payloadCustomerId =
      extractString(payload.customerId) ??
      extractString(payload.clientId) ??
      extractString(payload.contactId);

    let customerRecord = project.customer ?? null;
    const effectiveCustomerId = project.customerId ?? payloadCustomerId;

    if (!customerRecord && effectiveCustomerId) {
      customerRecord = await db.customer.findUnique({
        where: { id: effectiveCustomerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
          address: true,
          phone: true,
        },
      });
    }

    if (!customerRecord) {
      console.warn(
        `[Invoice Tracking] Skipping invoice - no customer found for project ${projectId}`
      );
      return {
        details: {
          workflow: definition.key,
          projectId,
          skippedNotification: true,
          reason: "No customer record",
        },
      } satisfies HandlerResult;
    }

    const recipient =
      extractString(customerRecord.email) ??
      extractString(payload.customerEmail) ??
      extractString(payload.primaryContactEmail);

    if (!recipient) {
      console.warn(
        `[Invoice Tracking] Skipping email - missing recipient for project ${projectId}`
      );
      return {
        details: {
          workflow: definition.key,
          projectId,
          skippedNotification: true,
          reason: "No customer email available",
        },
      } satisfies HandlerResult;
    }

    // Create the invoice for the completed project
    const invoice = await createProjectInvoice({
      db,
      organizationId: event.organizationId,
      project: {
        id: project.id,
        name: project.name,
        budget: project.budget,
        currency: project.currency,
        customer: customerRecord,
      },
      customer: customerRecord,
      createdById: event.userId,
    });

    console.log(
      `[Invoice Tracking] Generated invoice ${invoice.invoiceNumber} (${invoice.id}) for project ${projectId}`
    );

    // Build variables for the email template
    const variables = buildInvoiceTrackingVariablesFromProject({
      organizationName,
      project,
      invoice,
      customer: customerRecord,
      appUrl,
      triggeringUser,
    });

    const subject = renderTemplate(config.emailSubject, variables);
    const body = renderTemplate(config.emailBody, variables);

    const emailResult = await emailService.sendEmail({
      to: recipient,
      subject,
      htmlBody: convertToHtml(body),
    });

    if (!emailResult.success) {
      console.error(
        `[Invoice Tracking] Email send failed for project ${projectId}: ${emailResult.error}`
      );
      throw new Error(emailResult.error ?? "Failed to send invoice email");
    }

    console.log(
      `[Invoice Tracking] Email sent to ${recipient} (messageId: ${emailResult.messageId})`
    );

    return {
      recipient,
      subject,
      email: emailResult,
      details: {
        workflow: definition.key,
        projectId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        messageId: emailResult.messageId,
        invoiceCreated: true,
      },
    } satisfies HandlerResult;
  },
};

const contractRenewalHandler: PrebuiltWorkflowHandler = {
  key: "contract-renewal",
  matches: event => {
    const moduleName = event.module.toLowerCase();
    const allowedModules = new Set(["crm", "finance", "projects"]);
    if (!allowedModules.has(moduleName)) {
      return false;
    }

    const eventType = event.eventType.toLowerCase();
    if (!new Set(["created", "updated", "status_changed"]).has(eventType)) {
      return false;
    }

    const entity = event.entityType.toLowerCase();
    const allowedEntities = new Set([
      "customer",
      "contract",
      "subscription",
      "invoice",
    ]);
    if (!allowedEntities.has(entity)) {
      return false;
    }

    const payload = event.payload ?? {};
    const renewalDate =
      extractDate(payload.renewalDate) ??
      extractDate(payload.contractRenewalDate) ??
      extractDate(payload.nextRenewalDate);

    return Boolean(renewalDate);
  },
  async execute(context) {
    const {
      event,
      definition,
      config,
      db,
      emailService,
      organizationName,
      appUrl,
      triggeringUser,
    } = context;

    const payload = event.payload ?? {};
    const customerId =
      extractString(payload.customerId) ??
      extractString(payload.contractCustomerId) ??
      extractString(payload.clientId) ??
      extractString(payload.contactId) ??
      extractString(payload.id);

    if (!customerId) {
      throw new Error("Contract renewal workflow requires a customerId");
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        company: true,
      },
    });

    if (!customer) {
      throw new Error("Customer not found for contract renewal event");
    }

    const recipient =
      extractFirstEmail(payload.recipientEmail) ??
      extractFirstEmail(payload.recipientEmails) ??
      extractFirstEmail(payload.primaryContactEmail) ??
      extractString(customer.email) ??
      extractFirstEmail(payload.accountManagerEmail) ??
      extractString(triggeringUser?.email);

    if (!recipient) {
      throw new Error("Contract renewal workflow requires a recipient email");
    }

    const renewalDueDate =
      extractDate(payload.renewalDate) ??
      extractDate(payload.contractRenewalDate) ??
      extractDate(payload.nextRenewalDate);

    const invoiceDraft = await ensureRenewalInvoiceDraft({
      db,
      organizationId: event.organizationId,
      customerId,
      amount:
        payload.renewalAmount ??
        payload.amount ??
        payload.invoiceAmount ??
        payload.totalAmount,
      currency: extractString(payload.currency),
      dueDate:
        extractDate(payload.invoiceDueDate) ??
        extractDate(payload.dueDate) ??
        renewalDueDate,
      description:
        extractString(payload.invoiceDescription) ??
        extractString(payload.serviceName) ??
        extractString(payload.planName),
      createdById: event.userId,
      existingInvoiceId: extractString(payload.invoiceId),
    });

    const variables = buildContractRenewalVariables({
      organizationName,
      customer,
      payload,
      appUrl,
      triggeringUser,
      invoiceDraft,
      renewalDueDate,
    });

    const subject = renderTemplate(config.emailSubject, variables);
    const body = renderTemplate(config.emailBody, variables);

    const emailResult = await emailService.sendEmail({
      to: recipient,
      subject,
      htmlBody: convertToHtml(body),
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error ?? "Failed to send renewal email");
    }

    return {
      recipient,
      subject,
      email: emailResult,
      details: {
        workflow: definition.key,
        customerId,
        renewalDate: renewalDueDate,
        invoiceDraft,
      },
    } satisfies HandlerResult;
  },
};

const internalHealthHandler: PrebuiltWorkflowHandler = {
  key: "internal-health",
  matches: event => {
    const moduleName = event.module.toLowerCase();
    const allowedModules = new Set([
      "operations",
      "projects",
      "finance",
      "system",
      "analytics",
    ]);
    if (!allowedModules.has(moduleName)) {
      return false;
    }

    const eventType = event.eventType.toLowerCase();
    if (!new Set(["created", "updated", "status_changed"]).has(eventType)) {
      return false;
    }

    const entity = event.entityType.toLowerCase();
    const payload = event.payload ?? {};
    const snapshotKey = extractString(payload.snapshotKey)?.toLowerCase();
    const category = extractString(payload.category)?.toLowerCase();
    const flagged = Boolean(
      entity === "internal-health" ||
        entity === "health" ||
        snapshotKey === "internal-health" ||
        category === "internal-health" ||
        payload.internalHealth === true
    );

    return flagged;
  },
  async execute(context) {
    const {
      event,
      definition,
      config,
      db,
      emailService,
      organizationName,
      appUrl,
      triggeringUser,
    } = context;

    const payload = event.payload ?? {};
    const recipient =
      extractFirstEmail(payload.recipientEmail) ??
      extractFirstEmail(payload.recipientEmails) ??
      extractFirstEmail(payload.operationsLeadEmail) ??
      extractFirstEmail(payload.ownerEmail) ??
      extractString(triggeringUser?.email);

    if (!recipient) {
      throw new Error(
        "Internal health workflow requires at least one recipient email"
      );
    }

    const snapshot = await computeOperationsSnapshot({
      db,
      organizationId: event.organizationId,
    });

    const variables = buildInternalHealthVariables({
      organizationName,
      snapshot,
      payload,
      triggeringUser,
      appUrl,
    });

    const subject = renderTemplate(config.emailSubject, variables);
    const body = renderTemplate(config.emailBody, variables);

    const emailResult = await emailService.sendEmail({
      to: recipient,
      subject,
      htmlBody: convertToHtml(body),
    });

    if (!emailResult.success) {
      throw new Error(
        emailResult.error ?? "Failed to send internal health report email"
      );
    }

    return {
      recipient,
      subject,
      email: emailResult,
      details: {
        workflow: definition.key,
        snapshot,
      },
    } satisfies HandlerResult;
  },
};

const HANDLERS: PrebuiltWorkflowHandler[] = [
  leadToClientHandler,
  projectLifecycleHandler,
  invoiceTrackingHandler,
  contractRenewalHandler,
  internalHealthHandler,
];

function extractString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function extractFirstEmail(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = extractString(entry);
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }
  return extractString(value);
}

function renderTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(templateTokenPattern, (_, token: string) => {
    const value = variables[token];
    if (value === null || value === undefined) {
      return "";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof Prisma.Decimal) {
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return "";
  });
}

function convertToHtml(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (/<[^>]+>/.test(trimmed)) {
    return trimmed;
  }

  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(paragraph => paragraph.replace(/\n/g, "<br />"));

  return paragraphs.map(p => `<p>${p}</p>`).join("");
}

function buildLeadToClientVariables(args: {
  organizationName: string;
  customer: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  };
  projectLink: string;
  projectFolderLink: string;
  accountManagerName: string;
  accountManagerEmail?: string;
}): Record<string, unknown> {
  const {
    organizationName,
    customer,
    projectLink,
    projectFolderLink,
    accountManagerName,
    accountManagerEmail,
  } = args;

  const composedName = [
    customer.firstName ?? undefined,
    customer.lastName ?? undefined,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const clientName =
    (composedName.length > 0 ? composedName : undefined) ??
    customer.company ??
    "Client";

  return {
    clientName,
    companyName: organizationName,
    projectFolderLink,
    accountManagerName,
    accountManagerEmail: accountManagerEmail ?? "",
    projectLaunchLink: projectLink,
  } satisfies Record<string, unknown>;
}

function buildProjectLifecycleVariables(args: {
  organizationName: string;
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    customer?: {
      firstName: string | null;
      lastName: string | null;
      company: string | null;
      email: string | null;
    } | null;
    createdById: string | null;
  };
  payload: Record<string, unknown>;
  appUrl: string;
  triggeringUser?: { name?: string | null; email?: string | null } | null;
}): Record<string, unknown> {
  const { organizationName, project, payload, appUrl, triggeringUser } = args;
  const customer = project.customer;
  const composedName = [
    customer?.firstName ?? undefined,
    customer?.lastName ?? undefined,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const clientName =
    (composedName.length > 0 ? composedName : undefined) ??
    customer?.company ??
    "Client";

  const projectOwnerName =
    triggeringUser?.name ??
    extractString(payload.projectOwnerName) ??
    "Project team";

  const stage =
    extractString(payload.statusLabel) ??
    extractString(payload.status) ??
    project.status;

  return {
    clientName,
    companyName: organizationName,
    projectBoardLink: `${appUrl}/projects/${project.id}`,
    projectOwnerName,
    projectStage: stage,
    nextMilestoneName:
      extractString(payload.nextMilestoneName) ?? "Kickoff complete",
    nextMilestoneDueDate:
      extractDate(payload.nextMilestoneDueDate)?.toLocaleDateString() ?? "Soon",
  } satisfies Record<string, unknown>;
}

async function createProjectInvoice(args: {
  db: PrismaClient;
  organizationId: string;
  project: {
    id: string;
    name: string;
    budget: Prisma.Decimal | null;
    currency: string;
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      company: string | null;
      address: string | null;
      phone: string | null;
    };
  };
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    company: string | null;
    address: string | null;
    phone: string | null;
  };
  createdById?: string;
}): Promise<{
  id: string;
  invoiceNumber: string;
  totalAmount: Prisma.Decimal;
  dueDate: Date | null;
  status: InvoiceStatus;
  currency: string;
}> {
  const { db, organizationId, project, customer, createdById } = args;

  // Check if invoice already exists for this project
  const existing = await db.invoice.findFirst({
    where: {
      organizationId,
      notes: {
        contains: `Project ID: ${project.id}`,
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      dueDate: true,
      status: true,
      currency: true,
    },
  });

  if (existing) {
    return existing;
  }

  // Use project budget or default amount
  const totalAmount = project.budget ?? new Prisma.Decimal(0);
  const currency = project.currency ?? "USD";

  const customerName =
    resolveCustomerDisplayName(customer) ?? customer.company ?? "Client";

  const issueDate = new Date();
  const dueDate = addDays(issueDate, 30);

  const invoiceCount = await db.invoice.count({
    where: { organizationId },
  });
  const invoiceNumber = `INV-${issueDate.getFullYear()}${String(
    issueDate.getMonth() + 1
  ).padStart(2, "0")}-${invoiceCount + 1}`;

  const invoice = await db.invoice.create({
    data: {
      organizationId,
      customerId: customer.id,
      customerName,
      customerEmail: customer.email ?? "",
      customerAddress: customer.address,
      customerPhone: customer.phone,
      status: InvoiceStatus.DRAFT,
      currency,
      issueDate,
      dueDate,
      totalAmount,
      subtotal: totalAmount,
      taxAmount: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      paidAmount: new Prisma.Decimal(0),
      notes: `Invoice for project: ${project.name}\nProject ID: ${project.id}`,
      invoiceNumber,
      createdById: createdById ?? undefined,
      items: {
        create: [
          {
            description: `Project: ${project.name}`,
            quantity: new Prisma.Decimal(1),
            unitPrice: totalAmount,
            subtotal: totalAmount,
          },
        ],
      },
    },
  });

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: invoice.totalAmount,
    dueDate: invoice.dueDate,
    status: invoice.status,
    currency: invoice.currency,
  };
}

function buildInvoiceTrackingVariablesFromProject(args: {
  organizationName: string;
  project: {
    id: string;
    name: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: Prisma.Decimal;
    dueDate: Date | null;
    status: InvoiceStatus;
    currency: string;
  };
  customer: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    email: string | null;
  };
  appUrl: string;
  triggeringUser?: { name?: string | null; email?: string | null } | null;
}): Record<string, unknown> {
  const {
    organizationName,
    project,
    invoice,
    customer,
    appUrl,
    triggeringUser,
  } = args;

  const clientName =
    resolveCustomerDisplayName(customer) ?? customer.company ?? "Client";

  const invoiceStatusLabel =
    invoice.status.charAt(0).toUpperCase() +
    invoice.status.slice(1).toLowerCase();

  return {
    clientName,
    companyName: organizationName,
    projectName: project.name,
    invoiceNumber: invoice.invoiceNumber,
    invoiceAmount: formatCurrency(invoice.totalAmount, invoice.currency),
    invoiceDueDate: invoice.dueDate?.toLocaleDateString() ?? "Upon receipt",
    invoiceStatus: invoiceStatusLabel,
    invoiceLink: `${appUrl}/finance/invoices/${invoice.id}`,
    financeOwnerName: triggeringUser?.name ?? "Finance team",
  } satisfies Record<string, unknown>;
}

function resolveCustomerDisplayName(args: {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
}): string | undefined {
  const first = extractString(args.firstName);
  const last = extractString(args.lastName);
  const composed = [first, last]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();
  if (composed.length > 0) {
    return composed;
  }
  const company = extractString(args.company);
  return company ?? undefined;
}

function buildContractRenewalVariables(args: {
  organizationName: string;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    company: string | null;
  };
  payload: Record<string, unknown>;
  appUrl: string;
  triggeringUser?: { name?: string | null; email?: string | null } | null;
  invoiceDraft?: RenewalInvoiceResult | null;
  renewalDueDate?: Date;
}): Record<string, unknown> {
  const {
    organizationName,
    customer,
    payload,
    appUrl,
    triggeringUser,
    invoiceDraft,
    renewalDueDate,
  } = args;

  const clientName =
    resolveCustomerDisplayName(customer) ??
    extractString(payload.clientName) ??
    "Client";

  const accountManagerName =
    triggeringUser?.name ??
    extractString(payload.accountManagerName) ??
    "Account manager";

  const accountManagerEmail =
    triggeringUser?.email ??
    extractFirstEmail(payload.accountManagerEmail) ??
    "";

  const invoiceDueDate =
    renewalDueDate ??
    extractDate(payload.invoiceDueDate) ??
    invoiceDraft?.dueDate ??
    undefined;

  const renewalSummaryLink =
    extractString(payload.renewalSummaryLink) ??
    `${appUrl}/crm/customers/${customer.id}`;

  const invoiceDraftLink =
    extractString(payload.invoiceDraftLink) ??
    (invoiceDraft
      ? `${appUrl}/finance/invoices/${invoiceDraft.invoiceId}`
      : `${appUrl}/finance/invoices`);

  const invoiceSendDate =
    extractDate(payload.invoiceSendDate)?.toLocaleDateString() ??
    invoiceDueDate?.toLocaleDateString() ??
    "Soon";

  const amountDecimal =
    invoiceDraft?.amount ??
    coerceDecimal(
      payload.renewalAmount ??
        payload.invoiceAmount ??
        payload.amount ??
        payload.totalAmount
    );

  const invoiceCurrency =
    invoiceDraft?.currency ?? extractString(payload.currency) ?? "USD";

  const formattedAmount = amountDecimal
    ? formatCurrency(amountDecimal, invoiceCurrency)
    : undefined;

  return {
    clientName,
    companyName: organizationName,
    serviceName:
      extractString(payload.serviceName) ??
      extractString(payload.planName) ??
      "your services",
    renewalDate:
      invoiceDueDate?.toLocaleDateString() ??
      extractString(payload.renewalDateLabel) ??
      "Soon",
    renewalSummaryLink,
    accountManagerName,
    accountManagerEmail,
    invoiceDraftLink,
    invoiceSendDate,
    invoiceNumber:
      invoiceDraft?.invoiceNumber ??
      extractString(payload.invoiceNumber) ??
      "Pending",
    renewalAmount:
      formattedAmount ??
      extractString(payload.renewalAmountLabel) ??
      "To be confirmed",
    invoiceAmount:
      formattedAmount ?? extractString(payload.invoiceAmountLabel) ?? "Pending",
  } satisfies Record<string, unknown>;
}

async function ensureRenewalInvoiceDraft(args: {
  db: PrismaClient;
  organizationId: string;
  customerId: string;
  createdById?: string;
  amount?: unknown;
  currency?: string | null;
  dueDate?: Date | null;
  description?: string | null;
  existingInvoiceId?: string;
}): Promise<RenewalInvoiceResult | undefined> {
  const {
    db,
    organizationId,
    customerId,
    createdById,
    amount,
    currency,
    dueDate,
    description,
    existingInvoiceId,
  } = args;

  if (existingInvoiceId) {
    const existing = await db.invoice.findUnique({
      where: { id: existingInvoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
        status: true,
        currency: true,
      },
    });
    if (existing) {
      return {
        invoiceId: existing.id,
        invoiceNumber: existing.invoiceNumber,
        created: false,
        amount: existing.totalAmount,
        dueDate: existing.dueDate,
        status: existing.status,
        currency: existing.currency,
      } satisfies RenewalInvoiceResult;
    }
  }

  const totalAmount = coerceDecimal(amount);
  if (!totalAmount) {
    return undefined;
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      company: true,
      address: true,
      phone: true,
    },
  });

  if (!customer?.email) {
    return undefined;
  }

  const name = resolveCustomerDisplayName(customer) ?? "Client";
  const issueDate = new Date();
  const due = dueDate ?? addDays(issueDate, 15);
  const currencyCode = extractString(currency) ?? "USD";

  const invoiceCount = await db.invoice.count({
    where: { organizationId },
  });
  const invoiceNumber = `INV-${issueDate.getFullYear()}${String(
    issueDate.getMonth() + 1
  ).padStart(2, "0")}-${invoiceCount + 1}`;

  const trimmedDescription = description?.trim() ?? "";
  const hasDescription = trimmedDescription.length > 0;
  const lineDescription = hasDescription
    ? trimmedDescription
    : "Contract renewal";

  const created = await db.invoice.create({
    data: {
      organizationId,
      customerId,
      customerName: name,
      customerEmail: customer.email,
      customerAddress: customer.address ?? null,
      customerPhone: customer.phone ?? null,
      status: InvoiceStatus.DRAFT,
      currency: currencyCode,
      issueDate,
      dueDate: due,
      totalAmount: totalAmount,
      subtotal: totalAmount,
      taxAmount: new Prisma.Decimal(0),
      discountAmount: new Prisma.Decimal(0),
      shippingAmount: new Prisma.Decimal(0),
      paidAmount: new Prisma.Decimal(0),
      notes: hasDescription ? trimmedDescription : null,
      termsAndConditions: null,
      invoiceNumber,
      createdById: createdById ?? undefined,
      items: {
        create: [
          {
            description: lineDescription,
            quantity: new Prisma.Decimal(1),
            unitPrice: totalAmount,
            subtotal: totalAmount,
          },
        ],
      },
    },
  });

  return {
    invoiceId: created.id,
    invoiceNumber: created.invoiceNumber,
    created: true,
    amount: created.totalAmount,
    dueDate: created.dueDate,
    status: created.status,
    currency: created.currency,
  } satisfies RenewalInvoiceResult;
}

async function computeOperationsSnapshot(args: {
  db: PrismaClient;
  organizationId: string;
}): Promise<OperationsSnapshot> {
  const { db, organizationId } = args;
  const now = new Date();

  const [
    activeProjectCount,
    projectsAtRiskCount,
    overdueInvoiceCount,
    activeClientCount,
    overdueTaskCount,
  ] = await Promise.all([
    db.project.count({
      where: {
        organizationId,
        status: {
          in: [ProjectStatus.PLANNED, ProjectStatus.IN_PROGRESS],
        },
      },
    }),
    db.project.count({
      where: {
        organizationId,
        status: ProjectStatus.IN_PROGRESS,
        endDate: {
          not: null,
          lt: now,
        },
      },
    }),
    db.invoice.count({
      where: {
        organizationId,
        status: {
          in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE],
        },
        dueDate: {
          lt: now,
        },
      },
    }),
    db.customer.count({
      where: {
        organizationId,
        type: CustomerType.CUSTOMER,
      },
    }),
    db.task.count({
      where: {
        organizationId,
        status: {
          notIn: [TaskStatus.DONE, TaskStatus.ARCHIVED],
        },
        dueDate: {
          not: null,
          lt: now,
        },
      },
    }),
  ]);

  return {
    activeProjectCount,
    projectsAtRiskCount,
    overdueInvoiceCount,
    activeClientCount,
    overdueTaskCount,
  } satisfies OperationsSnapshot;
}

function buildInternalHealthVariables(args: {
  organizationName: string;
  snapshot: OperationsSnapshot;
  payload: Record<string, unknown>;
  appUrl: string;
  triggeringUser?: { name?: string | null; email?: string | null } | null;
}): Record<string, unknown> {
  const { organizationName, snapshot, payload, appUrl, triggeringUser } = args;

  const operationsLeadName =
    extractString(payload.operationsLeadName) ??
    triggeringUser?.name ??
    "Operations team";

  const operationsLeadEmail =
    extractFirstEmail(payload.operationsLeadEmail) ??
    triggeringUser?.email ??
    "";

  const topInsightLineOne =
    extractString(payload.topInsightLineOne) ??
    (snapshot.projectsAtRiskCount > 0
      ? `${pluralize(snapshot.projectsAtRiskCount, "project")} need attention`
      : "Project delivery is on track");

  const topInsightLineTwo =
    extractString(payload.topInsightLineTwo) ??
    (snapshot.overdueInvoiceCount > 0
      ? `${pluralize(snapshot.overdueInvoiceCount, "invoice")} awaiting payment`
      : "All invoices are current");

  const focusAreaOne =
    extractString(payload.focusAreaOne) ??
    (snapshot.overdueTaskCount > 0
      ? "Resolve overdue tasks to reduce risk"
      : "Review upcoming milestones with project owners");

  const focusAreaTwo =
    extractString(payload.focusAreaTwo) ??
    (snapshot.projectsAtRiskCount > 0
      ? "Schedule client check-ins for at-risk projects"
      : "Continue nurturing active client relationships");

  return {
    companyName: organizationName,
    operationsLeadName,
    operationsLeadEmail,
    healthDashboardLink: `${appUrl}/reports/operations`,
    currentProjectCount: snapshot.activeProjectCount,
    projectsAtRiskCount: snapshot.projectsAtRiskCount,
    overdueInvoiceCount: snapshot.overdueInvoiceCount,
    activeClientCount: snapshot.activeClientCount,
    topInsightLineOne,
    topInsightLineTwo,
    focusAreaOne,
    focusAreaTwo,
  } satisfies Record<string, unknown>;
}

function pluralize(count: number, singular: string, explicitPlural?: string) {
  const pluralForm = explicitPlural ?? `${singular}s`;
  const label = count === 1 ? singular : pluralForm;
  return `${count} ${label}`;
}

async function promoteCustomerToClient(args: {
  db: PrismaClient;
  organizationId: string;
  customerId: string;
}): Promise<CustomerPromotionResult> {
  const { db, organizationId, customerId } = args;
  const existing = await db.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { id: true, type: true, status: true },
  });

  if (!existing) {
    throw new Error("Customer not found for promotion");
  }

  if (
    existing.type === CustomerType.CUSTOMER &&
    existing.status === LeadStatus.QUALIFIED
  ) {
    return {
      customerId,
      previousType: existing.type,
      wasUpdated: false,
    } satisfies CustomerPromotionResult;
  }

  await db.customer.update({
    where: { id: customerId },
    data: {
      type: CustomerType.CUSTOMER,
    },
  });

  return {
    customerId,
    previousType: existing.type,
    wasUpdated: true,
  } satisfies CustomerPromotionResult;
}

async function ensureOnboardingProject(args: {
  db: PrismaClient;
  organizationId: string;
  customerId: string;
  projectName: string;
  startDate?: Date;
  createdById?: string;
  dealValue?: unknown;
  currency?: string;
  description?: string;
}): Promise<ProjectProvisionResult> {
  const {
    db,
    organizationId,
    customerId,
    projectName,
    startDate,
    createdById,
    dealValue,
    currency,
    description,
  } = args;

  const existing = await db.project.findFirst({
    where: { organizationId, customerId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existing) {
    return {
      projectId: existing.id,
      created: false,
    } satisfies ProjectProvisionResult;
  }

  const budget = coerceDecimal(dealValue);
  const project = await db.project.create({
    data: {
      organizationId,
      customerId,
      name: projectName,
      status: ProjectStatus.IN_PROGRESS,
      startDate: startDate ?? new Date(),
      createdById: createdById ?? undefined,
      budget: budget,
      currency: currency ?? "USD",
      description: description ?? undefined,
    },
    select: { id: true },
  });

  const taskSeedCount = await seedOnboardingTasks({
    db,
    organizationId,
    projectId: project.id,
    ownerId: createdById,
  });

  return {
    projectId: project.id,
    created: true,
    taskSeedCount,
  } satisfies ProjectProvisionResult;
}

async function seedOnboardingTasks(args: {
  db: PrismaClient;
  organizationId: string;
  projectId: string;
  ownerId?: string | null;
}): Promise<number> {
  const { db, organizationId, projectId, ownerId } = args;
  const existingCount = await db.task.count({ where: { projectId } });
  if (existingCount > 0) {
    return 0;
  }

  const now = new Date();
  const tasks = [
    {
      organizationId,
      projectId,
      title: "Schedule kickoff call",
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      order: 1,
      dueDate: addDays(now, 3),
      createdById: ownerId ?? undefined,
      assignedToId: ownerId ?? undefined,
    },
    {
      organizationId,
      projectId,
      title: "Collect onboarding documents",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      order: 2,
      dueDate: addDays(now, 5),
      createdById: ownerId ?? undefined,
      assignedToId: ownerId ?? undefined,
    },
    {
      organizationId,
      projectId,
      title: "Confirm billing preferences",
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      order: 3,
      dueDate: addDays(now, 7),
      createdById: ownerId ?? undefined,
      assignedToId: ownerId ?? undefined,
    },
  ];

  await db.task.createMany({ data: tasks });
  return tasks.length;
}

async function ensureProjectOwnerResource(args: {
  db: PrismaClient;
  projectId: string;
  assigneeId?: string | null;
}) {
  const { db, projectId, assigneeId } = args;
  if (!assigneeId) {
    return;
  }

  await db.projectResource.upsert({
    where: {
      projectId_assigneeId: {
        projectId,
        assigneeId,
      },
    },
    update: { updatedAt: new Date() },
    create: {
      projectId,
      assigneeId,
      role: "Owner",
      allocation: 100,
    },
  });
}

function addDays(date: Date, days: number): Date {
  const clone = new Date(date.getTime());
  clone.setDate(clone.getDate() + days);
  return clone;
}

function coerceDecimal(value: unknown): Prisma.Decimal | undefined {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Prisma.Decimal(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return new Prisma.Decimal(parsed);
    }
  }
  return undefined;
}

function formatCurrency(
  amount: Prisma.Decimal | undefined,
  currency: string
): string {
  if (!amount) {
    return "";
  }
  const numeric = Number(amount.toString());
  if (!Number.isFinite(numeric)) {
    return amount.toString();
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numeric);
}

export const prebuiltWorkflowExecutor = new PrebuiltWorkflowExecutor();
