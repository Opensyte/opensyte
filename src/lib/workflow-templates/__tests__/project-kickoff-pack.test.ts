/**
 * Tests for Project Kickoff Pack Workflow Template
 */

import { describe, it, expect } from "vitest";
import { projectKickoffPackTemplate } from "../project-kickoff-pack";

describe("Project Kickoff Pack Template", () => {
  it("should have correct template metadata", () => {
    expect(projectKickoffPackTemplate.id).toBe("project-kickoff-pack");
    expect(projectKickoffPackTemplate.name).toBe("Project Kickoff Pack");
    expect(projectKickoffPackTemplate.category).toBe("Project Management");
  });

  it("should have PROJECT_CREATED trigger", () => {
    expect(projectKickoffPackTemplate.triggers).toHaveLength(1);
    const trigger = projectKickoffPackTemplate.triggers[0];
    expect(trigger?.type).toBe("PROJECT_CREATED");
    expect(trigger?.module).toBe("PROJECTS");
  });

  it("should have CREATE_RECORD nodes for tasks", () => {
    const createTaskNodes = projectKickoffPackTemplate.nodes.filter(
      n => n.type === "CREATE_RECORD" && n.config?.model === "Task"
    );
    expect(createTaskNodes.length).toBeGreaterThanOrEqual(5);
  });

  it("should create client onboarding task", () => {
    const onboardingTask = projectKickoffPackTemplate.nodes.find(
      n =>
        n.type === "CREATE_RECORD" &&
        n.name?.toLowerCase().includes("onboarding")
    );
    expect(onboardingTask).toBeDefined();
  });

  it("should create requirements gathering task", () => {
    const requirementsTask = projectKickoffPackTemplate.nodes.find(
      n =>
        n.type === "CREATE_RECORD" &&
        n.name?.toLowerCase().includes("requirements")
    );
    expect(requirementsTask).toBeDefined();
  });

  it("should create team assignment task", () => {
    const teamTask = projectKickoffPackTemplate.nodes.find(
      n => n.type === "CREATE_RECORD" && n.name?.toLowerCase().includes("team")
    );
    expect(teamTask).toBeDefined();
  });

  it("should create kickoff meeting task", () => {
    const kickoffTask = projectKickoffPackTemplate.nodes.find(
      n =>
        n.type === "CREATE_RECORD" && n.name?.toLowerCase().includes("kickoff")
    );
    expect(kickoffTask).toBeDefined();
  });

  it("should have calendar event creation node", () => {
    const calendarNode = projectKickoffPackTemplate.nodes.find(
      n =>
        n.type === "ACTION" && n.config?.actionType === "create_calendar_event"
    );
    expect(calendarNode).toBeDefined();
    expect(calendarNode?.isOptional).toBe(true);
  });

  it("should have email notifications", () => {
    const emailNodes = projectKickoffPackTemplate.nodes.filter(
      n => n.type === "EMAIL"
    );
    expect(emailNodes.length).toBeGreaterThanOrEqual(2);
  });

  it("should have condition for checking task completion", () => {
    const conditionNode = projectKickoffPackTemplate.nodes.find(
      n => n.type === "CONDITION" && n.name?.toLowerCase().includes("completed")
    );
    expect(conditionNode).toBeDefined();
  });

  it("should have UPDATE_RECORD node for project status", () => {
    const updateNode = projectKickoffPackTemplate.nodes.find(
      n => n.type === "UPDATE_RECORD" && n.config?.model === "Project"
    );
    expect(updateNode).toBeDefined();
  });

  it("should have proper node connections", () => {
    expect(projectKickoffPackTemplate.connections.length).toBeGreaterThan(0);
  });

  it("should define output variables", () => {
    const variables = projectKickoffPackTemplate.variables;
    expect(variables).toBeDefined();
    expect(variables?.some(v => v.name === "kickoffTaskId")).toBe(true);
  });
});
