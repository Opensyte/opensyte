/**
 * Tests for Project Health Monitoring Workflow Template
 */

import { describe, it, expect } from "vitest";
import { projectHealthMonitorTemplate } from "../project-health-monitor";

describe("Project Health Monitor Template", () => {
  it("should have correct template metadata", () => {
    expect(projectHealthMonitorTemplate.id).toBe("project-health-monitor");
    expect(projectHealthMonitorTemplate.name).toBe("Project Health Monitoring");
    expect(projectHealthMonitorTemplate.category).toBe("Project Management");
  });

  it("should have SCHEDULED_DAILY trigger", () => {
    expect(projectHealthMonitorTemplate.triggers).toHaveLength(1);
    const trigger = projectHealthMonitorTemplate.triggers[0];
    expect(trigger?.type).toBe("SCHEDULED_DAILY");
  });

  it("should query active projects", () => {
    const queryNode = projectHealthMonitorTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" &&
        n.config?.outputVariable === "activeProjects"
    );
    expect(queryNode).toBeDefined();
  });

  it("should have LOOP node for checking each project", () => {
    const loopNode = projectHealthMonitorTemplate.nodes.find(
      n => n.type === "LOOP"
    );
    expect(loopNode).toBeDefined();
    expect(loopNode?.config?.dataSource).toBe("activeProjects");
  });

  it("should have PARALLEL node for health checks", () => {
    const parallelNode = projectHealthMonitorTemplate.nodes.find(
      n => n.type === "PARALLEL"
    );
    expect(parallelNode).toBeDefined();
    expect(parallelNode?.config?.failureHandling).toBe("continue_on_failure");
  });

  it("should check for overdue tasks", () => {
    const overdueCheck = projectHealthMonitorTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" && n.name?.toLowerCase().includes("overdue")
    );
    expect(overdueCheck).toBeDefined();
  });

  it("should check budget consumption", () => {
    const budgetCheck = projectHealthMonitorTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" && n.name?.toLowerCase().includes("budget")
    );
    expect(budgetCheck).toBeDefined();
    expect(budgetCheck?.config?.operation).toBe("aggregate");
  });

  it("should check milestone slippage", () => {
    const milestoneCheck = projectHealthMonitorTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" &&
        n.name?.toLowerCase().includes("milestone")
    );
    expect(milestoneCheck).toBeDefined();
  });

  it("should check for stale projects", () => {
    const staleCheck = projectHealthMonitorTemplate.nodes.find(
      n => n.type === "CONDITION" && n.name?.toLowerCase().includes("stale")
    );
    expect(staleCheck).toBeDefined();
  });

  it("should compile health report", () => {
    const compileNode = projectHealthMonitorTemplate.nodes.find(
      n =>
        n.type === "DATA_TRANSFORM" && n.name?.toLowerCase().includes("compile")
    );
    expect(compileNode).toBeDefined();
  });

  it("should send health report email", () => {
    const emailNode = projectHealthMonitorTemplate.nodes.find(
      n => n.type === "EMAIL"
    );
    expect(emailNode).toBeDefined();
    expect(emailNode?.config?.subject).toContain("Health");
  });

  it("should define health check variables", () => {
    const variables = projectHealthMonitorTemplate.variables;
    expect(variables).toBeDefined();
    expect(variables?.some(v => v.name === "overdueTasks")).toBe(true);
    expect(variables?.some(v => v.name === "totalSpent")).toBe(true);
    expect(variables?.some(v => v.name === "isStale")).toBe(true);
  });
});
