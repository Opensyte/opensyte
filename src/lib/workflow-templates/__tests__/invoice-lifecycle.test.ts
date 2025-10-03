/**
 * Tests for Invoice Lifecycle Automation Workflow Template
 */

import { describe, it, expect } from "vitest";
import { invoiceLifecycleTemplate } from "../invoice-lifecycle";

describe("Invoice Lifecycle Template", () => {
  it("should have correct template metadata", () => {
    expect(invoiceLifecycleTemplate.id).toBe("invoice-lifecycle");
    expect(invoiceLifecycleTemplate.name).toBe("Invoice Lifecycle Automation");
    expect(invoiceLifecycleTemplate.category).toBe("Finance");
  });

  it("should have INVOICE_STATUS_CHANGED trigger", () => {
    expect(invoiceLifecycleTemplate.triggers).toHaveLength(1);
    const trigger = invoiceLifecycleTemplate.triggers[0];
    expect(trigger?.type).toBe("INVOICE_STATUS_CHANGED");
    expect(trigger?.module).toBe("FINANCE");
    expect(trigger?.entityType).toBe("Invoice");
  });

  it("should have condition node checking for SENT status", () => {
    const sentCondition = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "CONDITION" && n.name?.toLowerCase().includes("sent")
    );
    expect(sentCondition).toBeDefined();
  });

  it("should have payment link generation node", () => {
    const paymentLinkNode = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "ACTION" && n.name?.toLowerCase().includes("payment link")
    );
    expect(paymentLinkNode).toBeDefined();
    expect(paymentLinkNode?.config?.actionType).toBe("create_payment_link");
    expect(paymentLinkNode?.isOptional).toBe(true);
  });

  it("should have email node for sending invoice", () => {
    const invoiceEmail = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("send invoice")
    );
    expect(invoiceEmail).toBeDefined();
    expect(invoiceEmail?.config?.subject).toContain("Invoice");
  });

  it("should have DELAY nodes for timing", () => {
    const delayNodes = invoiceLifecycleTemplate.nodes.filter(
      n => n.type === "DELAY"
    );
    expect(delayNodes.length).toBeGreaterThanOrEqual(3);
  });

  it("should have delay for 3 days before due date", () => {
    const delay3Days = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "DELAY" && n.name?.toLowerCase().includes("3 days")
    );
    expect(delay3Days).toBeDefined();
  });

  it("should have delay until due date", () => {
    const delayDueDate = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "DELAY" && n.name?.toLowerCase().includes("due date")
    );
    expect(delayDueDate).toBeDefined();
  });

  it("should have delay for 7 days after overdue", () => {
    const delay7Days = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "DELAY" && n.name?.toLowerCase().includes("7 days")
    );
    expect(delay7Days).toBeDefined();
    expect(delay7Days?.config?.delayMs).toBe(604800000); // 7 days in ms
  });

  it("should have payment reminder email", () => {
    const reminderEmail = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("reminder")
    );
    expect(reminderEmail).toBeDefined();
    expect(reminderEmail?.config?.subject).toContain("Reminder");
  });

  it("should have overdue notice emails", () => {
    const overdueEmails = invoiceLifecycleTemplate.nodes.filter(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("overdue")
    );
    expect(overdueEmails.length).toBeGreaterThanOrEqual(2);
  });

  it("should have first overdue notice", () => {
    const firstOverdue = invoiceLifecycleTemplate.nodes.find(
      n =>
        n.type === "EMAIL" &&
        n.name?.toLowerCase().includes("overdue") &&
        !n.name?.toLowerCase().includes("second")
    );
    expect(firstOverdue).toBeDefined();
    expect(firstOverdue?.config?.subject).toContain("OVERDUE");
  });

  it("should have second overdue notice", () => {
    const secondOverdue = invoiceLifecycleTemplate.nodes.find(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("second")
    );
    expect(secondOverdue).toBeDefined();
    expect(secondOverdue?.config?.subject).toContain("URGENT");
  });

  it("should have account manager notification", () => {
    const managerEmail = invoiceLifecycleTemplate.nodes.find(
      n =>
        n.type === "EMAIL" && n.name?.toLowerCase().includes("account manager")
    );
    expect(managerEmail).toBeDefined();
    expect(managerEmail?.config?.recipientType).toBe("account_manager");
    expect(managerEmail?.isOptional).toBe(true);
  });

  it("should have CONDITION nodes for checking payment status", () => {
    const conditionNodes = invoiceLifecycleTemplate.nodes.filter(
      n => n.type === "CONDITION"
    );
    expect(conditionNodes.length).toBeGreaterThanOrEqual(4);
  });

  it("should check if invoice is still unpaid before reminders", () => {
    const unpaidConditions = invoiceLifecycleTemplate.nodes.filter(
      n =>
        n.type === "CONDITION" &&
        (n.name?.toLowerCase().includes("unpaid") ||
          n.name?.toLowerCase().includes("overdue"))
    );
    expect(unpaidConditions.length).toBeGreaterThan(0);
  });

  it("should have proper node connections", () => {
    expect(invoiceLifecycleTemplate.connections.length).toBeGreaterThan(0);

    // Verify trigger connects to condition
    const triggerConnection = invoiceLifecycleTemplate.connections.find(
      c => c.sourceNodeId === "trigger-1"
    );
    expect(triggerConnection?.targetNodeId).toBe("condition-1");

    // Verify sequential flow
    const emailToDelay = invoiceLifecycleTemplate.connections.find(
      c => c.sourceNodeId === "email-1"
    );
    expect(emailToDelay?.targetNodeId).toBe("delay-1");
  });

  it("should define payment URL variable", () => {
    const variables = invoiceLifecycleTemplate.variables;
    expect(variables).toBeDefined();

    const paymentUrlVar = variables?.find(v => v.name === "paymentUrl");
    expect(paymentUrlVar).toBeDefined();
    expect(paymentUrlVar?.type).toBe("string");
  });

  it("should define days overdue variable", () => {
    const variables = invoiceLifecycleTemplate.variables;
    const daysOverdueVar = variables?.find(v => v.name === "daysOverdue");
    expect(daysOverdueVar).toBeDefined();
    expect(daysOverdueVar?.type).toBe("number");
  });

  it("should have nodes in proper execution order", () => {
    const nodes = invoiceLifecycleTemplate.nodes;
    const executionOrders = nodes.map(n => n.executionOrder);

    // Check that execution orders are sequential
    for (let i = 0; i < executionOrders.length - 1; i++) {
      expect(executionOrders[i]).toBeLessThanOrEqual(executionOrders[i + 1]!);
    }
  });

  it("should have email content with invoice details", () => {
    const emailNodes = invoiceLifecycleTemplate.nodes.filter(
      n => n.type === "EMAIL"
    );

    emailNodes.forEach(node => {
      expect(node.config?.htmlBody).toBeDefined();
      expect(typeof node.config?.htmlBody).toBe("string");
      // Check for variable placeholders
      expect(node.config?.htmlBody).toContain("{{");
    });
  });

  it("should include payment link in email templates", () => {
    const emailNodes = invoiceLifecycleTemplate.nodes.filter(
      n => n.type === "EMAIL"
    );

    const emailsWithPaymentLink = emailNodes.filter(node =>
      (node.config?.htmlBody as string)?.includes("paymentUrl")
    );
    expect(emailsWithPaymentLink.length).toBeGreaterThan(0);
  });

  it("should escalate after 7 days overdue", () => {
    // Find the sequence: overdue notice -> delay 7 days -> second notice -> manager notification
    const delay7Days = invoiceLifecycleTemplate.nodes.find(
      n => n.config?.delayMs === 604800000
    );
    expect(delay7Days).toBeDefined();

    const delay7DaysConnection = invoiceLifecycleTemplate.connections.find(
      c => c.sourceNodeId === delay7Days?.nodeId
    );
    expect(delay7DaysConnection).toBeDefined();
  });
});
