/**
 * Tests for Task Reminder and Escalation Workflow Template
 */

import { describe, it, expect } from "vitest";
import { taskReminderEscalationTemplate } from "../task-reminder-escalation";

describe("Task Reminder and Escalation Template", () => {
  it("should have correct template metadata", () => {
    expect(taskReminderEscalationTemplate.id).toBe("task-reminder-escalation");
    expect(taskReminderEscalationTemplate.name).toBe(
      "Task Reminder and Escalation"
    );
    expect(taskReminderEscalationTemplate.category).toBe("Project Management");
  });

  it("should have SCHEDULED_DAILY trigger", () => {
    expect(taskReminderEscalationTemplate.triggers).toHaveLength(1);
    const trigger = taskReminderEscalationTemplate.triggers[0];
    expect(trigger?.type).toBe("SCHEDULED_DAILY");
    expect(trigger?.module).toBe("SCHEDULER");
  });

  it("should have cron expression in trigger conditions", () => {
    const trigger = taskReminderEscalationTemplate.triggers[0];
    expect(trigger?.conditions?.cronExpression).toBeDefined();
    expect(typeof trigger?.conditions?.cronExpression).toBe("string");
  });

  it("should have DATA_TRANSFORM nodes for querying tasks", () => {
    const dataTransformNodes = taskReminderEscalationTemplate.nodes.filter(
      n => n.type === "DATA_TRANSFORM"
    );
    expect(dataTransformNodes.length).toBeGreaterThanOrEqual(2);

    const operations = dataTransformNodes.map(n => n.config?.operation);
    expect(operations.every(op => op === "query")).toBe(true);
  });

  it("should query upcoming tasks (due in 24 hours)", () => {
    const upcomingTasksNode = taskReminderEscalationTemplate.nodes.find(
      n => n.config?.outputVariable === "upcomingTasks"
    );
    expect(upcomingTasksNode).toBeDefined();
    expect(upcomingTasksNode?.type).toBe("DATA_TRANSFORM");
    expect(upcomingTasksNode?.config?.operation).toBe("query");
  });

  it("should query overdue tasks", () => {
    const overdueTasksNode = taskReminderEscalationTemplate.nodes.find(
      n => n.config?.outputVariable === "overdueTasks"
    );
    expect(overdueTasksNode).toBeDefined();
    expect(overdueTasksNode?.type).toBe("DATA_TRANSFORM");
    expect(overdueTasksNode?.config?.operation).toBe("query");
  });

  it("should have LOOP nodes for processing tasks", () => {
    const loopNodes = taskReminderEscalationTemplate.nodes.filter(
      n => n.type === "LOOP"
    );
    expect(loopNodes.length).toBeGreaterThanOrEqual(2);

    const dataSources = loopNodes.map(n => n.config?.dataSource);
    expect(dataSources).toContain("upcomingTasks");
    expect(dataSources).toContain("overdueTasks");
  });

  it("should have CONDITION nodes for escalation logic", () => {
    const conditionNodes = taskReminderEscalationTemplate.nodes.filter(
      n => n.type === "CONDITION"
    );
    expect(conditionNodes.length).toBeGreaterThanOrEqual(2);
  });

  it("should check for 2 days overdue escalation", () => {
    const condition2Days = taskReminderEscalationTemplate.nodes.find(
      n =>
        n.type === "CONDITION" &&
        n.name?.toLowerCase().includes("2") &&
        n.name?.toLowerCase().includes("days")
    );
    expect(condition2Days).toBeDefined();
  });

  it("should check for 5 days overdue escalation", () => {
    const condition5Days = taskReminderEscalationTemplate.nodes.find(
      n =>
        n.type === "CONDITION" &&
        Array.isArray(n.config?.conditions) &&
        (n.config?.conditions as Array<{ value: unknown }>).some(
          c => c.value === 5
        )
    );
    expect(condition5Days).toBeDefined();
  });

  it("should have email notifications for different escalation levels", () => {
    const emailNodes = taskReminderEscalationTemplate.nodes.filter(
      n => n.type === "EMAIL"
    );
    expect(emailNodes.length).toBeGreaterThanOrEqual(4);

    // Check for different recipient types
    const recipientTypes = emailNodes.map(
      n => n.config?.recipientType as string
    );
    expect(recipientTypes).toContain("task_assignee");
    expect(recipientTypes).toContain("project_manager");
    expect(recipientTypes).toContain("department_manager");
  });

  it("should have email for upcoming task reminder", () => {
    const upcomingEmail = taskReminderEscalationTemplate.nodes.find(
      n => n.type === "EMAIL" && n.name?.toLowerCase().includes("upcoming")
    );
    expect(upcomingEmail).toBeDefined();
    expect(upcomingEmail?.isOptional).toBe(true);
  });

  it("should have email for overdue notice", () => {
    const overdueEmail = taskReminderEscalationTemplate.nodes.find(
      n =>
        n.type === "EMAIL" &&
        n.name?.toLowerCase().includes("overdue") &&
        !n.name?.toLowerCase().includes("escalate")
    );
    expect(overdueEmail).toBeDefined();
    expect(overdueEmail?.isOptional).toBe(true);
  });

  it("should have email for PM escalation", () => {
    const pmEmail = taskReminderEscalationTemplate.nodes.find(
      n =>
        n.type === "EMAIL" && n.name?.toLowerCase().includes("project manager")
    );
    expect(pmEmail).toBeDefined();
    expect(pmEmail?.config?.recipientType).toBe("project_manager");
  });

  it("should have email for department manager escalation", () => {
    const deptEmail = taskReminderEscalationTemplate.nodes.find(
      n =>
        n.type === "EMAIL" &&
        n.name?.toLowerCase().includes("department manager")
    );
    expect(deptEmail).toBeDefined();
    expect(deptEmail?.config?.recipientType).toBe("department_manager");
  });

  it("should have proper node connections", () => {
    expect(taskReminderEscalationTemplate.connections.length).toBeGreaterThan(
      0
    );

    // Verify trigger connects to data transform
    const triggerConnection = taskReminderEscalationTemplate.connections.find(
      c => c.sourceNodeId === "trigger-1"
    );
    expect(triggerConnection?.targetNodeId).toBe("data-transform-1");
  });

  it("should define variables for task arrays", () => {
    const variables = taskReminderEscalationTemplate.variables;
    expect(variables).toBeDefined();
    expect(variables?.length).toBeGreaterThan(0);

    const variableNames = variables?.map(v => v.name);
    expect(variableNames).toContain("upcomingTasks");
    expect(variableNames).toContain("overdueTasks");
    expect(variableNames).toContain("task");
  });

  it("should have nodes in proper execution order", () => {
    const nodes = taskReminderEscalationTemplate.nodes;
    const executionOrders = nodes.map(n => n.executionOrder);

    // Check that execution orders are sequential
    for (let i = 0; i < executionOrders.length - 1; i++) {
      expect(executionOrders[i]).toBeLessThanOrEqual(executionOrders[i + 1]!);
    }
  });

  it("should mark all email nodes as optional", () => {
    const emailNodes = taskReminderEscalationTemplate.nodes.filter(
      n => n.type === "EMAIL"
    );
    expect(emailNodes.every(n => n.isOptional === true)).toBe(true);
  });
});
