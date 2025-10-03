/**
 * Tests for Retainer/Recurring Invoice Workflow Template
 */

import { describe, it, expect } from "vitest";
import { retainerRecurringInvoiceTemplate } from "../retainer-recurring-invoice";

describe("Retainer/Recurring Invoice Template", () => {
  it("should have correct template metadata", () => {
    expect(retainerRecurringInvoiceTemplate.id).toBe(
      "retainer-recurring-invoice"
    );
    expect(retainerRecurringInvoiceTemplate.name).toBe(
      "Retainer/Recurring Invoice Automation"
    );
    expect(retainerRecurringInvoiceTemplate.category).toBe("Finance");
  });

  it("should have SCHEDULED_MONTHLY trigger", () => {
    expect(retainerRecurringInvoiceTemplate.triggers).toHaveLength(1);
    const trigger = retainerRecurringInvoiceTemplate.triggers[0];
    expect(trigger?.type).toBe("SCHEDULED_MONTHLY");
    expect(trigger?.module).toBe("SCHEDULER");
  });

  it("should have cron expression for monthly execution", () => {
    const trigger = retainerRecurringInvoiceTemplate.triggers[0];
    expect(trigger?.conditions?.cronExpression).toBe("0 0 1 * *");
  });

  it("should query active retainer clients", () => {
    const queryNode = retainerRecurringInvoiceTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" &&
        n.config?.outputVariable === "retainerClients"
    );
    expect(queryNode).toBeDefined();
    expect(queryNode?.config?.operation).toBe("query");
  });

  it("should have LOOP node for processing clients", () => {
    const loopNode = retainerRecurringInvoiceTemplate.nodes.find(
      n => n.type === "LOOP"
    );
    expect(loopNode).toBeDefined();
    expect(loopNode?.config?.dataSource).toBe("retainerClients");
  });

  it("should create invoice for each retainer client", () => {
    const createInvoiceNode = retainerRecurringInvoiceTemplate.nodes.find(
      n => n.type === "CREATE_RECORD" && n.config?.model === "Invoice"
    );
    expect(createInvoiceNode).toBeDefined();
    expect(createInvoiceNode?.config?.fieldMappings).toBeDefined();
  });

  it("should send invoice email to client", () => {
    const emailNode = retainerRecurringInvoiceTemplate.nodes.find(
      n => n.type === "EMAIL"
    );
    expect(emailNode).toBeDefined();
    expect(emailNode?.config?.subject).toContain("Retainer");
  });

  it("should update next invoice date", () => {
    const updateNode = retainerRecurringInvoiceTemplate.nodes.find(
      n => n.type === "UPDATE_RECORD" && n.config?.model === "RetainerClient"
    );
    expect(updateNode).toBeDefined();
  });

  it("should have proper node connections", () => {
    expect(retainerRecurringInvoiceTemplate.connections.length).toBeGreaterThan(
      0
    );
  });

  it("should define variables", () => {
    const variables = retainerRecurringInvoiceTemplate.variables;
    expect(variables).toBeDefined();
    expect(variables?.some(v => v.name === "retainerClients")).toBe(true);
    expect(variables?.some(v => v.name === "invoiceId")).toBe(true);
  });
});
