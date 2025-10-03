/**
 * Retainer/Recurring Invoice Workflow Template
 *
 * Automatically generates and sends invoices for retainer clients on a monthly schedule.
 * Runs on a monthly scheduled trigger.
 */

import type { WorkflowTemplate } from "./types";

export const retainerRecurringInvoiceTemplate: WorkflowTemplate = {
  id: "retainer-recurring-invoice",
  name: "Retainer/Recurring Invoice Automation",
  description:
    "Automatically generate and send monthly invoices for retainer clients",
  category: "Finance",

  triggers: [
    {
      type: "SCHEDULED_MONTHLY",
      module: "SCHEDULER",
      entityType: "Schedule",
      eventType: "MONTHLY_CRON",
      conditions: {
        cronExpression: "0 0 1 * *", // Run on 1st of each month at midnight
        timezone: "UTC",
      },
    },
  ],

  nodes: [
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Monthly Schedule Trigger",
      executionOrder: 0,
      config: {},
    },
    {
      nodeId: "data-transform-1",
      type: "DATA_TRANSFORM",
      name: "Query Active Retainer Clients",
      executionOrder: 1,
      config: {
        operation: "query",
        source: "retainerClients",
        queryFilters: {
          isActive: true,
          nextInvoiceDate: {
            lte: "{{now}}",
          },
        },
        outputVariable: "retainerClients",
      },
    },
    {
      nodeId: "loop-1",
      type: "LOOP",
      name: "Process Each Retainer Client",
      executionOrder: 2,
      config: {
        dataSource: "retainerClients",
        itemVariable: "retainerClient",
        maxIterations: 100,
        loopBodyNodeId: "create-invoice-1",
      },
    },
    {
      nodeId: "create-invoice-1",
      type: "CREATE_RECORD",
      name: "Generate Retainer Invoice",
      executionOrder: 3,
      config: {
        model: "Invoice",
        fieldMappings: {
          organizationId: "{{retainerClient.organizationId}}",
          customerId: "{{retainerClient.customerId}}",
          customerEmail: "{{retainerClient.customer.email}}",
          customerName:
            "{{retainerClient.customer.firstName}} {{retainerClient.customer.lastName}}",
          invoiceNumber: "RET-{{timestamp}}-{{retainerClient.id}}",
          status: "SENT",
          issueDate: "{{now}}",
          dueDate: "{{addDays(now, 30)}}",
          paymentTerms: "Net 30",
          subtotal: "{{retainerClient.amount}}",
          taxAmount: "0",
          discountAmount: "0",
          totalAmount: "{{retainerClient.amount}}",
          currency: "{{retainerClient.currency}}",
          notes:
            "Monthly retainer invoice for {{formatDate(now, 'MMMM yyyy')}}",
        },
        outputVariable: "invoiceId",
      },
    },
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Send Invoice to Client",
      executionOrder: 4,
      config: {
        subject: "Monthly Retainer Invoice - {{formatDate(now, 'MMMM yyyy')}}",
        htmlBody: `
          <h2>Monthly Retainer Invoice</h2>
          <p>Dear {{retainerClient.customer.firstName}},</p>
          <p>Your monthly retainer invoice for {{formatDate(now, 'MMMM yyyy')}} is ready.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Service Period:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(now, 'MMMM yyyy')}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>{{retainerClient.currency}} {{retainerClient.amount}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(addDays(now, 30))}}</td>
            </tr>
          </table>

          <p><a href="{{appUrl}}/invoices/{{invoiceId}}">View Invoice</a></p>
          
          <p>Thank you for your continued partnership.</p>
        `,
        recipientEmail: "{{retainerClient.customer.email}}",
      },
    },
    {
      nodeId: "update-retainer-1",
      type: "UPDATE_RECORD",
      name: "Update Next Invoice Date",
      executionOrder: 5,
      config: {
        model: "RetainerClient",
        recordId: "{{retainerClient.id}}",
        fieldMappings: {
          nextInvoiceDate: "{{addMonths(now, 1)}}",
        },
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
      name: "retainerClients",
      type: "array",
      description: "Active retainer clients due for invoicing",
    },
    {
      name: "retainerClient",
      type: "object",
      description: "Current retainer client being processed",
    },
    {
      name: "invoiceId",
      type: "string",
      description: "ID of the generated invoice",
    },
  ],
};
