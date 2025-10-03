/**
 * Project Health Monitoring Workflow Template
 *
 * Automatically monitors project health daily and sends reports to stakeholders.
 * Runs on a daily scheduled trigger.
 */

import type { WorkflowTemplate } from "./types";

export const projectHealthMonitorTemplate: WorkflowTemplate = {
  id: "project-health-monitor",
  name: "Project Health Monitoring",
  description:
    "Daily automated checks on project health with alerts for overdue tasks, budget issues, and stale projects",
  category: "Project Management",

  triggers: [
    {
      type: "SCHEDULED_DAILY",
      module: "SCHEDULER",
      entityType: "Schedule",
      eventType: "DAILY_CRON",
      conditions: {
        cronExpression: "0 8 * * *", // Run at 8 AM daily
        timezone: "UTC",
      },
    },
  ],

  nodes: [
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Daily Health Check Trigger",
      executionOrder: 0,
      config: {},
    },
    {
      nodeId: "data-transform-1",
      type: "DATA_TRANSFORM",
      name: "Query Active Projects",
      executionOrder: 1,
      config: {
        operation: "query",
        source: "projects",
        queryFilters: {
          status: { in: ["PLANNED", "IN_PROGRESS"] },
        },
        outputVariable: "activeProjects",
      },
    },
    {
      nodeId: "loop-1",
      type: "LOOP",
      name: "Check Each Project Health",
      executionOrder: 2,
      config: {
        dataSource: "activeProjects",
        itemVariable: "project",
        maxIterations: 100,
        loopBodyNodeId: "parallel-1",
      },
    },
    {
      nodeId: "parallel-1",
      type: "PARALLEL",
      name: "Run Health Checks in Parallel",
      executionOrder: 3,
      config: {
        parallelNodeIds: [
          "check-overdue-1",
          "check-budget-1",
          "check-milestones-1",
          "check-stale-1",
        ],
        failureHandling: "continue_on_failure",
      },
    },
    {
      nodeId: "check-overdue-1",
      type: "DATA_TRANSFORM",
      name: "Check for Overdue Tasks",
      executionOrder: 4,
      config: {
        operation: "query",
        source: "project.tasks",
        queryFilters: {
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { lt: "{{now}}" },
        },
        outputVariable: "overdueTasks",
      },
    },
    {
      nodeId: "check-budget-1",
      type: "DATA_TRANSFORM",
      name: "Check Budget Consumption",
      executionOrder: 4,
      config: {
        operation: "aggregate",
        source: "project.expenses",
        aggregation: "sum",
        aggregateField: "amount",
        outputVariable: "totalSpent",
      },
    },
    {
      nodeId: "check-milestones-1",
      type: "DATA_TRANSFORM",
      name: "Check Milestone Slippage",
      executionOrder: 4,
      config: {
        operation: "query",
        source: "project.milestones",
        queryFilters: {
          status: { not: "COMPLETED" },
          dueDate: { lt: "{{now}}" },
        },
        outputVariable: "slippedMilestones",
      },
    },
    {
      nodeId: "check-stale-1",
      type: "CONDITION",
      name: "Check if Project is Stale",
      executionOrder: 4,
      config: {
        conditions: [
          {
            field: "project.lastActivityDate",
            operator: "less_than",
            value: "{{subtractDays(now, 7)}}",
          },
        ],
        logicalOperator: "AND",
        trueBranch: "flag-stale-1",
        falseBranch: null,
      },
    },
    {
      nodeId: "flag-stale-1",
      type: "ACTION",
      name: "Flag as Stale Project",
      executionOrder: 5,
      config: {
        actionType: "set_variable",
        variable: "isStale",
        value: true,
      },
    },
    {
      nodeId: "condition-1",
      type: "CONDITION",
      name: "Check if Issues Found",
      executionOrder: 6,
      config: {
        conditions: [
          {
            field: "overdueTasks.length",
            operator: "greater_than",
            value: 0,
          },
          {
            field: "totalSpent",
            operator: "greater_than",
            value: "{{multiply(project.budget, 0.8)}}",
          },
          {
            field: "slippedMilestones.length",
            operator: "greater_than",
            value: 0,
          },
          {
            field: "isStale",
            operator: "equals",
            value: true,
          },
        ],
        logicalOperator: "OR",
        trueBranch: "compile-report-1",
        falseBranch: null,
      },
    },
    {
      nodeId: "compile-report-1",
      type: "DATA_TRANSFORM",
      name: "Compile Health Report",
      executionOrder: 7,
      config: {
        operation: "extract",
        source: "project",
        extractFields: [
          "name",
          "status",
          "budget",
          "overdueTasks",
          "totalSpent",
          "slippedMilestones",
          "isStale",
        ],
        outputVariable: "healthReport",
      },
    },
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Send Health Report to PM",
      executionOrder: 8,
      config: {
        subject: "Project Health Alert: {{project.name}}",
        htmlBody: `
          <h2>Project Health Report</h2>
          <p>The following issues were detected for project <strong>{{project.name}}</strong>:</p>
          
          {{#if overdueTasks.length}}
          <h3 style="color: #d32f2f;">⚠️ Overdue Tasks</h3>
          <p>{{overdueTasks.length}} task(s) are overdue.</p>
          {{/if}}

          {{#if budgetWarning}}
          <h3 style="color: #ff9800;">⚠️ Budget Warning</h3>
          <p>Project has consumed {{budgetPercentage}}% of budget ({{project.currency}} {{totalSpent}} of {{project.budget}}).</p>
          {{/if}}

          {{#if slippedMilestones.length}}
          <h3 style="color: #d32f2f;">⚠️ Milestone Slippage</h3>
          <p>{{slippedMilestones.length}} milestone(s) are behind schedule.</p>
          {{/if}}

          {{#if isStale}}
          <h3 style="color: #ff9800;">⚠️ Stale Project</h3>
          <p>No activity recorded in the last 7 days.</p>
          {{/if}}

          <p><a href="{{appUrl}}/projects/{{project.id}}">View Project Details</a></p>
          
          <p>Please review and take appropriate action.</p>
        `,
        recipientType: "project_manager",
      },
    },
  ],

  connections: [
    {
      sourceNodeId: "trigger-1",
      targetNodeId: "data-transform-1",
      executionOrder: 0,
    },
    {
      sourceNodeId: "data-transform-1",
      targetNodeId: "loop-1",
      executionOrder: 1,
    },
  ],

  variables: [
    {
      name: "activeProjects",
      type: "array",
      description: "All active projects to monitor",
    },
    {
      name: "project",
      type: "object",
      description: "Current project being checked",
    },
    {
      name: "overdueTasks",
      type: "array",
      description: "Overdue tasks for the project",
    },
    {
      name: "totalSpent",
      type: "number",
      description: "Total amount spent on project",
    },
    {
      name: "slippedMilestones",
      type: "array",
      description: "Milestones behind schedule",
    },
    {
      name: "isStale",
      type: "boolean",
      description: "Whether project has no recent activity",
    },
    {
      name: "healthReport",
      type: "object",
      description: "Compiled health report data",
    },
  ],
};
