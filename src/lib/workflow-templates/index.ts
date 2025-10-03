/**
 * Workflow Templates Index
 *
 * Exports all pre-built workflow templates for the agency platform.
 */

export { leadToClientAutoSetupTemplate } from "./lead-to-client-auto-setup";
export { taskReminderEscalationTemplate } from "./task-reminder-escalation";
export { invoiceLifecycleTemplate } from "./invoice-lifecycle";
export { projectKickoffPackTemplate } from "./project-kickoff-pack";
export { retainerRecurringInvoiceTemplate } from "./retainer-recurring-invoice";
export { projectHealthMonitorTemplate } from "./project-health-monitor";
export { contractRenewalReminderTemplate } from "./contract-renewal-reminder";

export type { WorkflowTemplate } from "./types";

import { leadToClientAutoSetupTemplate } from "./lead-to-client-auto-setup";
import { taskReminderEscalationTemplate } from "./task-reminder-escalation";
import { invoiceLifecycleTemplate } from "./invoice-lifecycle";
import { projectKickoffPackTemplate } from "./project-kickoff-pack";
import { retainerRecurringInvoiceTemplate } from "./retainer-recurring-invoice";
import { projectHealthMonitorTemplate } from "./project-health-monitor";
import { contractRenewalReminderTemplate } from "./contract-renewal-reminder";
import type { WorkflowTemplate } from "./types";

/**
 * All available workflow templates
 */
export const allWorkflowTemplates: WorkflowTemplate[] = [
  leadToClientAutoSetupTemplate,
  taskReminderEscalationTemplate,
  invoiceLifecycleTemplate,
  projectKickoffPackTemplate,
  retainerRecurringInvoiceTemplate,
  projectHealthMonitorTemplate,
  contractRenewalReminderTemplate,
];

/**
 * Get a workflow template by ID
 */
export function getWorkflowTemplateById(
  id: string
): WorkflowTemplate | undefined {
  return allWorkflowTemplates.find(template => template.id === id);
}

/**
 * Get workflow templates by category
 */
export function getWorkflowTemplatesByCategory(
  category: string
): WorkflowTemplate[] {
  return allWorkflowTemplates.filter(
    template => template.category === category
  );
}

/**
 * Get all workflow template categories
 */
export function getWorkflowTemplateCategories(): string[] {
  const categories = new Set(
    allWorkflowTemplates.map(template => template.category)
  );
  return Array.from(categories);
}
