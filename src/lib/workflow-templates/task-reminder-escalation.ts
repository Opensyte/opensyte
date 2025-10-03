/**
 * Task Reminder and Escalation Workflow Template
 *
 * Automatically sends reminders for upcoming and overdue tasks with escalation.
 * Runs daily on a scheduled trigger.
 */

import type { WorkflowTemplate } from "./types";

export const taskReminderEscalationTemplate: WorkflowTemplate = {
  id: "task-reminder-escalation",
  name: "Task Reminder and Escalation",
  description:
    "Automatically send reminders for upcoming and overdue tasks with escalation to managers",
  category: "Project Management",

  triggers: [
    {
      type: "SCHEDULED_DAILY",
      module: "SCHEDULER",
      entityType: "Schedule",
      eventType: "DAILY_CRON",
      conditions: {
        cronExpression: "0 9 * * *", // Run at 9 AM daily
        timezone: "UTC",
      },
    },
  ],

  nodes: [
    // 1. Trigger Node
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Daily Schedule Trigger",
      executionOrder: 0,
      config: {
        schedule: "daily",
        time: "09:00",
      },
    },

    // 2. Query Upcoming Tasks (due in 24 hours)
    {
      nodeId: "data-transform-1",
      type: "DATA_TRANSFORM",
      name: "Query Upcoming Tasks",
      executionOrder: 1,
      config: {
        operation: "query",
        source: "tasks",
        queryFilters: {
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: {
            gte: "{{now}}",
            lte: "{{addHours(now, 24)}}",
          },
        },
        outputVariable: "upcomingTasks",
      },
    },

    // 3. Loop Through Upcoming Tasks
    {
      nodeId: "loop-1",
      type: "LOOP",
      name: "Process Upcoming Tasks",
      executionOrder: 2,
      config: {
        dataSource: "upcomingTasks",
        itemVariable: "task",
        maxIterations: 100,
        loopBodyNodeId: "email-1",
      },
    },

    // 4. Send Reminder Email for Upcoming Task
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Send Upcoming Task Reminder",
      executionOrder: 3,
      config: {
        subject: "Reminder: Task Due Tomorrow - {{task.title}}",
        htmlBody: `
          <h2>Task Reminder</h2>
          <p>This is a friendly reminder that the following task is due within 24 hours:</p>
          <ul>
            <li><strong>Task:</strong> {{task.title}}</li>
            <li><strong>Project:</strong> {{task.project.name}}</li>
            <li><strong>Due Date:</strong> {{formatDate(task.dueDate)}}</li>
            <li><strong>Priority:</strong> {{task.priority}}</li>
          </ul>
          <p>{{task.description}}</p>
          <p><a href="{{appUrl}}/tasks/{{task.id}}">View Task</a></p>
        `,
        recipientType: "task_assignee",
      },
      isOptional: true,
    },

    // 5. Query Overdue Tasks
    {
      nodeId: "data-transform-2",
      type: "DATA_TRANSFORM",
      name: "Query Overdue Tasks",
      executionOrder: 4,
      config: {
        operation: "query",
        source: "tasks",
        queryFilters: {
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: {
            lt: "{{now}}",
          },
        },
        outputVariable: "overdueTasks",
      },
    },

    // 6. Loop Through Overdue Tasks
    {
      nodeId: "loop-2",
      type: "LOOP",
      name: "Process Overdue Tasks",
      executionOrder: 5,
      config: {
        dataSource: "overdueTasks",
        itemVariable: "task",
        maxIterations: 100,
        loopBodyNodeId: "condition-1",
      },
    },

    // 7. Check Days Overdue
    {
      nodeId: "condition-1",
      type: "CONDITION",
      name: "Check Overdue Duration",
      executionOrder: 6,
      config: {
        conditions: [
          {
            field: "task.daysOverdue",
            operator: "greater_than_or_equal",
            value: 5,
          },
        ],
        logicalOperator: "AND",
        trueBranch: "email-4", // Escalate to manager
        falseBranch: "condition-2", // Check if 2+ days overdue
      },
    },

    // 8. Check if 2+ Days Overdue
    {
      nodeId: "condition-2",
      type: "CONDITION",
      name: "Check if 2+ Days Overdue",
      executionOrder: 7,
      config: {
        conditions: [
          {
            field: "task.daysOverdue",
            operator: "greater_than_or_equal",
            value: 2,
          },
        ],
        logicalOperator: "AND",
        trueBranch: "email-3", // Escalate to PM
        falseBranch: "email-2", // Send overdue notice to assignee
      },
    },

    // 9. Send Overdue Notice to Assignee
    {
      nodeId: "email-2",
      type: "EMAIL",
      name: "Send Overdue Notice",
      executionOrder: 8,
      config: {
        subject: "OVERDUE: Task Past Due Date - {{task.title}}",
        htmlBody: `
          <h2>Task Overdue</h2>
          <p>The following task is now overdue:</p>
          <ul>
            <li><strong>Task:</strong> {{task.title}}</li>
            <li><strong>Project:</strong> {{task.project.name}}</li>
            <li><strong>Due Date:</strong> {{formatDate(task.dueDate)}}</li>
            <li><strong>Days Overdue:</strong> {{task.daysOverdue}}</li>
            <li><strong>Priority:</strong> {{task.priority}}</li>
          </ul>
          <p>Please complete this task as soon as possible.</p>
          <p><a href="{{appUrl}}/tasks/{{task.id}}">View Task</a></p>
        `,
        recipientType: "task_assignee",
      },
      isOptional: true,
    },

    // 10. Escalate to Project Manager (2+ days overdue)
    {
      nodeId: "email-3",
      type: "EMAIL",
      name: "Escalate to Project Manager",
      executionOrder: 9,
      config: {
        subject: "Escalation: Task Overdue 2+ Days - {{task.title}}",
        htmlBody: `
          <h2>Task Escalation - Project Manager</h2>
          <p>The following task has been overdue for 2+ days:</p>
          <ul>
            <li><strong>Task:</strong> {{task.title}}</li>
            <li><strong>Project:</strong> {{task.project.name}}</li>
            <li><strong>Assigned To:</strong> {{task.assignedTo.name}}</li>
            <li><strong>Due Date:</strong> {{formatDate(task.dueDate)}}</li>
            <li><strong>Days Overdue:</strong> {{task.daysOverdue}}</li>
            <li><strong>Priority:</strong> {{task.priority}}</li>
          </ul>
          <p>This task requires your attention and follow-up with the assignee.</p>
          <p><a href="{{appUrl}}/tasks/{{task.id}}">View Task</a></p>
        `,
        recipientType: "project_manager",
      },
      isOptional: true,
    },

    // 11. Escalate to Department Manager (5+ days overdue)
    {
      nodeId: "email-4",
      type: "EMAIL",
      name: "Escalate to Department Manager",
      executionOrder: 10,
      config: {
        subject: "URGENT: Task Overdue 5+ Days - {{task.title}}",
        htmlBody: `
          <h2>Task Escalation - Department Manager</h2>
          <p>The following task has been overdue for 5+ days and requires immediate attention:</p>
          <ul>
            <li><strong>Task:</strong> {{task.title}}</li>
            <li><strong>Project:</strong> {{task.project.name}}</li>
            <li><strong>Assigned To:</strong> {{task.assignedTo.name}}</li>
            <li><strong>Project Manager:</strong> {{task.project.manager.name}}</li>
            <li><strong>Due Date:</strong> {{formatDate(task.dueDate)}}</li>
            <li><strong>Days Overdue:</strong> {{task.daysOverdue}}</li>
            <li><strong>Priority:</strong> {{task.priority}}</li>
          </ul>
          <p>This task is significantly overdue and may be blocking project progress.</p>
          <p><a href="{{appUrl}}/tasks/{{task.id}}">View Task</a></p>
        `,
        recipientType: "department_manager",
      },
      isOptional: true,
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
    {
      sourceNodeId: "loop-1",
      targetNodeId: "data-transform-2",
      executionOrder: 2,
    },
    {
      sourceNodeId: "data-transform-2",
      targetNodeId: "loop-2",
      executionOrder: 3,
    },
    // Loop 2 connections are handled by the loop body
  ],

  variables: [
    {
      name: "upcomingTasks",
      type: "array",
      description: "Tasks due within 24 hours",
    },
    {
      name: "overdueTasks",
      type: "array",
      description: "Tasks that are past their due date",
    },
    {
      name: "task",
      type: "object",
      description: "Current task being processed in loop",
    },
  ],
};
