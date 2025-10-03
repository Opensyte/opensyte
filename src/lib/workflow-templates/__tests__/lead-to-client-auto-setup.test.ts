/**
 * Tests for Lead-to-Client Auto-Setup Workflow Template
 */

import { describe, it, expect } from "vitest";
import { leadToClientAutoSetupTemplate } from "../lead-to-client-auto-setup";

describe("Lead-to-Client Auto-Setup Template", () => {
  it("should have correct template metadata", () => {
    expect(leadToClientAutoSetupTemplate.id).toBe("lead-to-client-auto-setup");
    expect(leadToClientAutoSetupTemplate.name).toBe(
      "Lead-to-Client Auto-Setup"
    );
    expect(leadToClientAutoSetupTemplate.category).toBe("Sales & Onboarding");
  });

  it("should have DEAL_STATUS_CHANGED trigger", () => {
    expect(leadToClientAutoSetupTemplate.triggers).toHaveLength(1);
    const trigger = leadToClientAutoSetupTemplate.triggers[0];
    expect(trigger?.type).toBe("DEAL_STATUS_CHANGED");
    expect(trigger?.module).toBe("CRM");
    expect(trigger?.entityType).toBe("Deal");
  });

  it("should have all required nodes", () => {
    const nodeTypes = leadToClientAutoSetupTemplate.nodes.map(n => n.type);
    expect(nodeTypes).toContain("TRIGGER");
    expect(nodeTypes).toContain("CONDITION");
    expect(nodeTypes).toContain("CREATE_RECORD");
    expect(nodeTypes).toContain("LOOP");
    expect(nodeTypes).toContain("EMAIL");
  });

  it("should have CREATE_RECORD nodes for Customer, Project, Task, and Invoice", () => {
    const createRecordNodes = leadToClientAutoSetupTemplate.nodes.filter(
      n => n.type === "CREATE_RECORD"
    );
    expect(createRecordNodes.length).toBeGreaterThanOrEqual(4);

    const models = createRecordNodes.map(n => n.config?.model);
    expect(models).toContain("Customer");
    expect(models).toContain("Project");
    expect(models).toContain("Task");
    expect(models).toContain("Invoice");
  });

  it("should have condition node checking for CLOSED_WON status", () => {
    const conditionNode = leadToClientAutoSetupTemplate.nodes.find(
      n => n.type === "CONDITION"
    );
    expect(conditionNode).toBeDefined();
    expect(conditionNode?.config?.conditions).toBeDefined();
    expect(Array.isArray(conditionNode?.config?.conditions)).toBe(true);
  });

  it("should have loop node for creating onboarding tasks", () => {
    const loopNode = leadToClientAutoSetupTemplate.nodes.find(
      n => n.type === "LOOP"
    );
    expect(loopNode).toBeDefined();
    expect(loopNode?.config?.dataSource).toBe("onboardingTasks");
    expect(loopNode?.config?.loopBodyNodeId).toBe("create-task-1");
  });

  it("should have email notifications for PM and account owner", () => {
    const emailNodes = leadToClientAutoSetupTemplate.nodes.filter(
      n => n.type === "EMAIL"
    );
    expect(emailNodes.length).toBeGreaterThanOrEqual(2);
    expect(emailNodes.every(n => n.isOptional === true)).toBe(true);
  });

  it("should have proper node connections", () => {
    expect(leadToClientAutoSetupTemplate.connections.length).toBeGreaterThan(0);

    // Verify trigger connects to condition
    const triggerConnection = leadToClientAutoSetupTemplate.connections.find(
      c => c.sourceNodeId === "trigger-1"
    );
    expect(triggerConnection?.targetNodeId).toBe("condition-1");

    // Verify condition connects to create customer
    const conditionConnection = leadToClientAutoSetupTemplate.connections.find(
      c => c.sourceNodeId === "condition-1"
    );
    expect(conditionConnection?.targetNodeId).toBe("create-customer-1");
  });

  it("should define output variables", () => {
    const variables = leadToClientAutoSetupTemplate.variables;
    expect(variables).toBeDefined();
    expect(variables?.length).toBeGreaterThan(0);

    const variableNames = variables?.map(v => v.name);
    expect(variableNames).toContain("customerId");
    expect(variableNames).toContain("projectId");
    expect(variableNames).toContain("invoiceId");
  });

  it("should have default onboarding tasks", () => {
    const onboardingTasksVar = leadToClientAutoSetupTemplate.variables?.find(
      v => v.name === "onboardingTasks"
    );
    expect(onboardingTasksVar).toBeDefined();
    expect(onboardingTasksVar?.type).toBe("array");
    expect(Array.isArray(onboardingTasksVar?.defaultValue)).toBe(true);
    expect(
      (onboardingTasksVar?.defaultValue as unknown[]).length
    ).toBeGreaterThan(0);
  });

  it("should have nodes in proper execution order", () => {
    const nodes = leadToClientAutoSetupTemplate.nodes;
    const executionOrders = nodes.map(n => n.executionOrder);

    // Check that execution orders are sequential
    for (let i = 0; i < executionOrders.length - 1; i++) {
      expect(executionOrders[i]).toBeLessThanOrEqual(executionOrders[i + 1]!);
    }
  });

  it("should have field mappings for customer creation", () => {
    const customerNode = leadToClientAutoSetupTemplate.nodes.find(
      n => n.config?.model === "Customer"
    );
    expect(customerNode).toBeDefined();
    expect(customerNode?.config?.fieldMappings).toBeDefined();

    const mappings = customerNode?.config?.fieldMappings as Record<
      string,
      unknown
    >;
    expect(mappings.type).toBe("CUSTOMER");
    expect(mappings.firstName).toBeDefined();
    expect(mappings.lastName).toBeDefined();
    expect(mappings.email).toBeDefined();
  });

  it("should have field mappings for project creation", () => {
    const projectNode = leadToClientAutoSetupTemplate.nodes.find(
      n => n.config?.model === "Project"
    );
    expect(projectNode).toBeDefined();
    expect(projectNode?.config?.fieldMappings).toBeDefined();

    const mappings = projectNode?.config?.fieldMappings as Record<
      string,
      unknown
    >;
    expect(mappings.status).toBe("PLANNED");
    expect(mappings.name).toBeDefined();
    expect(mappings.organizationId).toBeDefined();
  });

  it("should have field mappings for invoice creation", () => {
    const invoiceNode = leadToClientAutoSetupTemplate.nodes.find(
      n => n.config?.model === "Invoice"
    );
    expect(invoiceNode).toBeDefined();
    expect(invoiceNode?.config?.fieldMappings).toBeDefined();

    const mappings = invoiceNode?.config?.fieldMappings as Record<
      string,
      unknown
    >;
    expect(mappings.status).toBe("DRAFT");
    expect(mappings.customerId).toBeDefined();
    expect(mappings.totalAmount).toBeDefined();
  });
});
