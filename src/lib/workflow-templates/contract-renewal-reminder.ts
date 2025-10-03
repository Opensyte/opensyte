/**
 * Contract Renewal Reminder Workflow Template
 *
 * Automatically sends reminders before contracts expire with escalation.
 * Runs on a daily scheduled trigger.
 */

import type { WorkflowTemplate } from "./types";

export const contractRenewalReminderTemplate: WorkflowTemplate = {
  id: "contract-renewal-reminder",
  name: "Contract Renewal Reminder",
  description:
    "Automatically remind account managers of upcoming contract renewals with escalation",
  category: "Sales & Account Management",

  triggers: [
    {
      type: "SCHEDULED_DAILY",
      module: "SCHEDULER",
      entityType: "Schedule",
      eventType: "DAILY_CRON",
      conditions: {
        cronExpression: "0 10 * * *", // Run at 10 AM daily
        timezone: "UTC",
      },
    },
  ],

  nodes: [
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Daily Contract Check Trigger",
      executionOrder: 0,
      config: {},
    },
    {
      nodeId: "data-transform-1",
      type: "DATA_TRANSFORM",
      name: "Query Contracts Expiring in 30 Days",
      executionOrder: 1,
      config: {
        operation: "query",
        source: "contracts",
        queryFilters: {
          status: "ACTIVE",
          endDate: {
            gte: "{{now}}",
            lte: "{{addDays(now, 30)}}",
          },
          renewalNotified: false,
        },
        outputVariable: "expiringContracts",
      },
    },
    {
      nodeId: "loop-1",
      type: "LOOP",
      name: "Process Each Expiring Contract",
      executionOrder: 2,
      config: {
        dataSource: "expiringContracts",
        itemVariable: "contract",
        maxIterations: 100,
        loopBodyNodeId: "create-task-1",
      },
    },
    {
      nodeId: "create-task-1",
      type: "CREATE_RECORD",
      name: "Create Renewal Task",
      executionOrder: 3,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{contract.organizationId}}",
          title: "Contract Renewal: {{contract.name}}",
          description:
            "Contract expires on {{formatDate(contract.endDate)}}. Contact client to discuss renewal terms.",
          status: "TODO",
          priority: "HIGH",
          dueDate: "{{contract.endDate}}",
          assignedToId: "{{contract.accountManagerId}}",
        },
        outputVariable: "renewalTaskId",
      },
    },
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Send Renewal Notification",
      executionOrder: 4,
      config: {
        subject: "Contract Renewal Required: {{contract.name}}",
        htmlBody: `
          <h2>Contract Renewal Notification</h2>
          <p>The following contract is expiring in 30 days:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Contract:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.name}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.customer.firstName}} {{contract.customer.lastName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>End Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(contract.endDate)}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Contract Value:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.currency}} {{contract.value}}</td>
            </tr>
          </table>

          <p>A renewal task has been created and assigned to you.</p>
          
          <p><strong>Action Required:</strong> Contact the client to discuss renewal terms and prepare a renewal proposal.</p>

          <p><a href="{{appUrl}}/tasks/{{renewalTaskId}}">View Renewal Task</a></p>
        `,
        recipientType: "account_manager",
      },
    },
    {
      nodeId: "update-contract-1",
      type: "UPDATE_RECORD",
      name: "Mark Contract as Notified",
      executionOrder: 5,
      config: {
        model: "Contract",
        recordId: "{{contract.id}}",
        fieldMappings: {
          renewalNotified: true,
        },
      },
    },
    {
      nodeId: "data-transform-2",
      type: "DATA_TRANSFORM",
      name: "Query Contracts Expiring in 14 Days",
      executionOrder: 6,
      config: {
        operation: "query",
        source: "contracts",
        queryFilters: {
          status: "ACTIVE",
          endDate: {
            gte: "{{now}}",
            lte: "{{addDays(now, 14)}}",
          },
        },
        outputVariable: "urgentContracts",
      },
    },
    {
      nodeId: "loop-2",
      type: "LOOP",
      name: "Process Urgent Contracts",
      executionOrder: 7,
      config: {
        dataSource: "urgentContracts",
        itemVariable: "contract",
        maxIterations: 100,
        loopBodyNodeId: "email-2",
      },
    },
    {
      nodeId: "email-2",
      type: "EMAIL",
      name: "Send 14-Day Reminder",
      executionOrder: 8,
      config: {
        subject: "URGENT: Contract Expires in 14 Days - {{contract.name}}",
        htmlBody: `
          <h2 style="color: #ff9800;">Urgent: Contract Renewal Reminder</h2>
          <p>This is a reminder that the following contract expires in 14 days:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Contract:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.name}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.customer.firstName}} {{contract.customer.lastName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>End Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong style="color: #ff9800;">{{formatDate(contract.endDate)}}</strong></td>
            </tr>
          </table>

          <p><strong>Immediate action required to prevent service interruption.</strong></p>

          <p><a href="{{appUrl}}/contracts/{{contract.id}}">View Contract</a></p>
        `,
        recipientType: "account_manager",
      },
      isOptional: true,
    },
    {
      nodeId: "data-transform-3",
      type: "DATA_TRANSFORM",
      name: "Query Contracts Expiring in 7 Days",
      executionOrder: 9,
      config: {
        operation: "query",
        source: "contracts",
        queryFilters: {
          status: "ACTIVE",
          endDate: {
            gte: "{{now}}",
            lte: "{{addDays(now, 7)}}",
          },
        },
        outputVariable: "criticalContracts",
      },
    },
    {
      nodeId: "loop-3",
      type: "LOOP",
      name: "Process Critical Contracts",
      executionOrder: 10,
      config: {
        dataSource: "criticalContracts",
        itemVariable: "contract",
        maxIterations: 100,
        loopBodyNodeId: "email-3",
      },
    },
    {
      nodeId: "email-3",
      type: "EMAIL",
      name: "Escalate to Sales Manager",
      executionOrder: 11,
      config: {
        subject: "CRITICAL: Contract Expires in 7 Days - {{contract.name}}",
        htmlBody: `
          <h2 style="color: #d32f2f;">Critical: Contract Expiring Soon</h2>
          <p>The following contract expires in 7 days and requires immediate attention:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Contract:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.name}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.customer.firstName}} {{contract.customer.lastName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Account Manager:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.accountManager.name}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>End Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong style="color: #d32f2f;">{{formatDate(contract.endDate)}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Contract Value:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{contract.currency}} {{contract.value}}</td>
            </tr>
          </table>

          <p><strong>This contract requires immediate escalation and intervention.</strong></p>

          <p><a href="{{appUrl}}/contracts/{{contract.id}}">View Contract</a></p>
        `,
        recipientType: "sales_manager",
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
    {
      sourceNodeId: "loop-2",
      targetNodeId: "data-transform-3",
      executionOrder: 4,
    },
    {
      sourceNodeId: "data-transform-3",
      targetNodeId: "loop-3",
      executionOrder: 5,
    },
  ],

  variables: [
    {
      name: "expiringContracts",
      type: "array",
      description: "Contracts expiring in 30 days",
    },
    {
      name: "urgentContracts",
      type: "array",
      description: "Contracts expiring in 14 days",
    },
    {
      name: "criticalContracts",
      type: "array",
      description: "Contracts expiring in 7 days",
    },
    {
      name: "contract",
      type: "object",
      description: "Current contract being processed",
    },
    {
      name: "renewalTaskId",
      type: "string",
      description: "ID of the created renewal task",
    },
  ],
};
