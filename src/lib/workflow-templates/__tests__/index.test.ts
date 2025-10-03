/**
 * Tests for Workflow Templates Index
 */

import { describe, it, expect } from "vitest";
import {
  allWorkflowTemplates,
  getWorkflowTemplateById,
  getWorkflowTemplatesByCategory,
  getWorkflowTemplateCategories,
} from "../index";

describe("Workflow Templates Index", () => {
  it("should export all 7 workflow templates", () => {
    expect(allWorkflowTemplates).toHaveLength(7);
  });

  it("should have unique template IDs", () => {
    const ids = allWorkflowTemplates.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(allWorkflowTemplates.length);
  });

  it("should have all required templates", () => {
    const ids = allWorkflowTemplates.map(t => t.id);
    expect(ids).toContain("lead-to-client-auto-setup");
    expect(ids).toContain("task-reminder-escalation");
    expect(ids).toContain("invoice-lifecycle");
    expect(ids).toContain("project-kickoff-pack");
    expect(ids).toContain("retainer-recurring-invoice");
    expect(ids).toContain("project-health-monitor");
    expect(ids).toContain("contract-renewal-reminder");
  });

  it("should get template by ID", () => {
    const template = getWorkflowTemplateById("invoice-lifecycle");
    expect(template).toBeDefined();
    expect(template?.name).toBe("Invoice Lifecycle Automation");
  });

  it("should return undefined for non-existent template ID", () => {
    const template = getWorkflowTemplateById("non-existent-template");
    expect(template).toBeUndefined();
  });

  it("should get templates by category", () => {
    const financeTemplates = getWorkflowTemplatesByCategory("Finance");
    expect(financeTemplates.length).toBeGreaterThan(0);
    expect(financeTemplates.every(t => t.category === "Finance")).toBe(true);
  });

  it("should get all template categories", () => {
    const categories = getWorkflowTemplateCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories).toContain("Finance");
    expect(categories).toContain("Project Management");
    expect(categories).toContain("Sales & Onboarding");
  });

  it("should have valid template structure for all templates", () => {
    allWorkflowTemplates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(Array.isArray(template.triggers)).toBe(true);
      expect(Array.isArray(template.nodes)).toBe(true);
      expect(Array.isArray(template.connections)).toBe(true);
    });
  });

  it("should have at least one trigger for each template", () => {
    allWorkflowTemplates.forEach(template => {
      expect(template.triggers.length).toBeGreaterThan(0);
    });
  });

  it("should have at least one node for each template", () => {
    allWorkflowTemplates.forEach(template => {
      expect(template.nodes.length).toBeGreaterThan(0);
    });
  });

  it("should have unique node IDs within each template", () => {
    allWorkflowTemplates.forEach(template => {
      const nodeIds = template.nodes.map(n => n.nodeId);
      const uniqueNodeIds = new Set(nodeIds);
      expect(uniqueNodeIds.size).toBe(nodeIds.length);
    });
  });

  it("should have valid connections referencing existing nodes", () => {
    allWorkflowTemplates.forEach(template => {
      const nodeIds = new Set(template.nodes.map(n => n.nodeId));
      template.connections.forEach(conn => {
        expect(nodeIds.has(conn.sourceNodeId)).toBe(true);
        expect(nodeIds.has(conn.targetNodeId)).toBe(true);
      });
    });
  });
});
