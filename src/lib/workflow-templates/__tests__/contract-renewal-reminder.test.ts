/**
 * Tests for Contract Renewal Reminder Workflow Template
 */

import { describe, it, expect } from "vitest";
import { contractRenewalReminderTemplate } from "../contract-renewal-reminder";

describe("Contract Renewal Reminder Template", () => {
  it("should have correct template metadata", () => {
    expect(contractRenewalReminderTemplate.id).toBe(
      "contract-renewal-reminder"
    );
    expect(contractRenewalReminderTemplate.name).toBe(
      "Contract Renewal Reminder"
    );
    expect(contractRenewalReminderTemplate.category).toBe(
      "Sales & Account Management"
    );
  });

  it("should have SCHEDULED_DAILY trigger", () => {
    expect(contractRenewalReminderTemplate.triggers).toHaveLength(1);
    const trigger = contractRenewalReminderTemplate.triggers[0];
    expect(trigger?.type).toBe("SCHEDULED_DAILY");
  });

  it("should query contracts expiring in 30 days", () => {
    const query30Days = contractRenewalReminderTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" &&
        n.config?.outputVariable === "expiringContracts"
    );
    expect(query30Days).toBeDefined();
  });

  it("should query contracts expiring in 14 days", () => {
    const query14Days = contractRenewalReminderTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" &&
        n.config?.outputVariable === "urgentContracts"
    );
    expect(query14Days).toBeDefined();
  });

  it("should query contracts expiring in 7 days", () => {
    const query7Days = contractRenewalReminderTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" &&
        n.config?.outputVariable === "criticalContracts"
    );
    expect(query7Days).toBeDefined();
  });

  it("should have LOOP nodes for processing contracts", () => {
    const loopNodes = contractRenewalReminderTemplate.nodes.filter(
      n => n.type === "LOOP"
    );
    expect(loopNodes.length).toBeGreaterThanOrEqual(3);
  });

  it("should create renewal task", () => {
    const createTaskNode = contractRenewalReminderTemplate.nodes.find(
      n => n.type === "CREATE_RECORD" && n.config?.model === "Task"
    );
    expect(createTaskNode).toBeDefined();
  });

  it("should send initial renewal notification", () => {
    const initialEmail = contractRenewalReminderTemplate.nodes.find(
      n =>
        n.type === "EMAIL" &&
        n.name?.toLowerCase().includes("renewal notification")
    );
    expect(initialEmail).toBeDefined();
  });

  it("should send 14-day reminder", () => {
    const reminder14Days = contractRenewalReminderTemplate.nodes.find(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("14")
    );
    expect(reminder14Days).toBeDefined();
    expect(reminder14Days?.config?.subject).toContain("14 Days");
  });

  it("should escalate to sales manager at 7 days", () => {
    const escalationEmail = contractRenewalReminderTemplate.nodes.find(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("sales manager")
    );
    expect(escalationEmail).toBeDefined();
    expect(escalationEmail?.config?.recipientType).toBe("sales_manager");
  });

  it("should update contract as notified", () => {
    const updateNode = contractRenewalReminderTemplate.nodes.find(
      n => n.type === "UPDATE_RECORD" && n.config?.model === "Contract"
    );
    expect(updateNode).toBeDefined();
  });

  it("should have proper node connections", () => {
    expect(contractRenewalReminderTemplate.connections.length).toBeGreaterThan(
      0
    );
  });

  it("should define contract variables", () => {
    const variables = contractRenewalReminderTemplate.variables;
    expect(variables).toBeDefined();
    expect(variables?.some(v => v.name === "expiringContracts")).toBe(true);
    expect(variables?.some(v => v.name === "urgentContracts")).toBe(true);
    expect(variables?.some(v => v.name === "criticalContracts")).toBe(true);
  });
});
