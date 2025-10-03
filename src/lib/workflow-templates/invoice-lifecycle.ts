/**
 * Invoice Lifecycle Automation Workflow Template
 *
 * Automatically manages invoice lifecycle from sending to payment collection.
 * Triggered when invoice status changes.
 */

import type { WorkflowTemplate } from "./types";

export const invoiceLifecycleTemplate: WorkflowTemplate = {
  id: "invoice-lifecycle",
  name: "Invoice Lifecycle Automation",
  description:
    "Automatically send invoices, track payments, send reminders, and handle overdue notices",
  category: "Finance",

  triggers: [
    {
      type: "INVOICE_STATUS_CHANGED",
      module: "FINANCE",
      entityType: "Invoice",
      eventType: "INVOICE_STATUS_CHANGED",
    },
  ],

  nodes: [
    // 1. Trigger Node
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Invoice Status Changed",
      executionOrder: 0,
      config: {},
    },

    // 2. Condition - Check if status is SENT
    {
      nodeId: "condition-1",
      type: "CONDITION",
      name: "Check if Invoice Sent",
      executionOrder: 1,
      config: {
        conditions: [
          {
            field: "payload.status",
            operator: "equals",
            value: "SENT",
          },
        ],
        logicalOperator: "AND",
        trueBranch: "create-payment-link-1",
        falseBranch: null,
      },
    },

    // 3. Create Payment Link (Stripe)
    {
      nodeId: "create-payment-link-1",
      type: "ACTION",
      name: "Generate Stripe Payment Link",
      executionOrder: 2,
      config: {
        actionType: "create_payment_link",
        invoiceId: "{{payload.id}}",
        outputVariable: "paymentUrl",
      },
      isOptional: true,
    },

    // 4. Send Invoice Email with Payment Link
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Send Invoice to Customer",
      executionOrder: 3,
      config: {
        subject: "Invoice {{payload.invoiceNumber}} from {{organizationName}}",
        htmlBody: `
          <h2>Invoice {{payload.invoiceNumber}}</h2>
          <p>Dear {{payload.customerName}},</p>
          <p>Thank you for your business. Please find your invoice details below:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{payload.invoiceNumber}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Issue Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(payload.issueDate)}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(payload.dueDate)}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>{{payload.currency}} {{payload.totalAmount}}</strong></td>
            </tr>
          </table>

          {{#if paymentUrl}}
          <div style="margin: 30px 0;">
            <a href="{{paymentUrl}}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Invoice Online</a>
          </div>
          {{/if}}

          <p>{{payload.notes}}</p>
          
          <p><a href="{{appUrl}}/invoices/{{payload.id}}">View Invoice Details</a></p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>{{organizationName}}</p>
        `,
        recipientEmail: "{{payload.customerEmail}}",
      },
    },

    // 5. Delay - Wait until 3 days before due date
    {
      nodeId: "delay-1",
      type: "DELAY",
      name: "Wait Until 3 Days Before Due",
      executionOrder: 4,
      config: {
        delayUntil: "{{subtractDays(payload.dueDate, 3)}}",
        delayType: "until_date",
      },
    },

    // 6. Condition - Check if still unpaid
    {
      nodeId: "condition-2",
      type: "CONDITION",
      name: "Check if Still Unpaid",
      executionOrder: 5,
      config: {
        conditions: [
          {
            field: "invoice.status",
            operator: "not_equals",
            value: "PAID",
          },
        ],
        logicalOperator: "AND",
        trueBranch: "email-2",
        falseBranch: null,
      },
    },

    // 7. Send Payment Reminder
    {
      nodeId: "email-2",
      type: "EMAIL",
      name: "Send Payment Reminder",
      executionOrder: 6,
      config: {
        subject: "Payment Reminder: Invoice {{payload.invoiceNumber}} Due Soon",
        htmlBody: `
          <h2>Payment Reminder</h2>
          <p>Dear {{payload.customerName}},</p>
          <p>This is a friendly reminder that invoice {{payload.invoiceNumber}} is due in 3 days.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{payload.invoiceNumber}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(payload.dueDate)}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>{{payload.currency}} {{payload.totalAmount}}</strong></td>
            </tr>
          </table>

          {{#if paymentUrl}}
          <div style="margin: 30px 0;">
            <a href="{{paymentUrl}}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a>
          </div>
          {{/if}}

          <p><a href="{{appUrl}}/invoices/{{payload.id}}">View Invoice</a></p>
          
          <p>Thank you for your prompt attention to this matter.</p>
          <p>Best regards,<br>{{organizationName}}</p>
        `,
        recipientEmail: "{{payload.customerEmail}}",
      },
      isOptional: true,
    },

    // 8. Delay - Wait until due date
    {
      nodeId: "delay-2",
      type: "DELAY",
      name: "Wait Until Due Date",
      executionOrder: 7,
      config: {
        delayUntil: "{{payload.dueDate}}",
        delayType: "until_date",
      },
    },

    // 9. Condition - Check if overdue
    {
      nodeId: "condition-3",
      type: "CONDITION",
      name: "Check if Overdue",
      executionOrder: 8,
      config: {
        conditions: [
          {
            field: "invoice.status",
            operator: "not_equals",
            value: "PAID",
          },
          {
            field: "now",
            operator: "greater_than",
            value: "{{payload.dueDate}}",
          },
        ],
        logicalOperator: "AND",
        trueBranch: "email-3",
        falseBranch: null,
      },
    },

    // 10. Send Overdue Notice
    {
      nodeId: "email-3",
      type: "EMAIL",
      name: "Send Overdue Notice",
      executionOrder: 9,
      config: {
        subject: "OVERDUE: Invoice {{payload.invoiceNumber}} Payment Required",
        htmlBody: `
          <h2 style="color: #d32f2f;">Invoice Overdue</h2>
          <p>Dear {{payload.customerName}},</p>
          <p>Our records indicate that invoice {{payload.invoiceNumber}} is now overdue.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{payload.invoiceNumber}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(payload.dueDate)}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>{{payload.currency}} {{payload.totalAmount}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Days Overdue:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong style="color: #d32f2f;">{{daysOverdue}}</strong></td>
            </tr>
          </table>

          {{#if paymentUrl}}
          <div style="margin: 30px 0;">
            <a href="{{paymentUrl}}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a>
          </div>
          {{/if}}

          <p>Please remit payment immediately to avoid any service interruptions or late fees.</p>
          
          <p><a href="{{appUrl}}/invoices/{{payload.id}}">View Invoice</a></p>
          
          <p>If you have already made payment, please disregard this notice.</p>
          <p>Best regards,<br>{{organizationName}}</p>
        `,
        recipientEmail: "{{payload.customerEmail}}",
      },
    },

    // 11. Delay - Wait 7 days
    {
      nodeId: "delay-3",
      type: "DELAY",
      name: "Wait 7 Days",
      executionOrder: 10,
      config: {
        delayMs: 604800000, // 7 days in milliseconds
        delayType: "duration",
      },
    },

    // 12. Condition - Check if still overdue
    {
      nodeId: "condition-4",
      type: "CONDITION",
      name: "Check if Still Overdue",
      executionOrder: 11,
      config: {
        conditions: [
          {
            field: "invoice.status",
            operator: "not_equals",
            value: "PAID",
          },
        ],
        logicalOperator: "AND",
        trueBranch: "email-4",
        falseBranch: null,
      },
    },

    // 13. Send Second Overdue Notice
    {
      nodeId: "email-4",
      type: "EMAIL",
      name: "Send Second Overdue Notice",
      executionOrder: 12,
      config: {
        subject: "URGENT: Invoice {{payload.invoiceNumber}} - 7 Days Overdue",
        htmlBody: `
          <h2 style="color: #d32f2f;">Urgent: Invoice Overdue</h2>
          <p>Dear {{payload.customerName}},</p>
          <p>This is our second notice regarding overdue invoice {{payload.invoiceNumber}}.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{payload.invoiceNumber}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Original Due Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">{{formatDate(payload.dueDate)}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>{{payload.currency}} {{payload.totalAmount}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Days Overdue:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong style="color: #d32f2f;">{{daysOverdue}}</strong></td>
            </tr>
          </table>

          {{#if paymentUrl}}
          <div style="margin: 30px 0;">
            <a href="{{paymentUrl}}" style="background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Immediately</a>
          </div>
          {{/if}}

          <p><strong>Immediate payment is required to maintain your account in good standing.</strong></p>
          
          <p><a href="{{appUrl}}/invoices/{{payload.id}}">View Invoice</a></p>
          
          <p>If payment has been made, please contact us immediately with payment details.</p>
          <p>Best regards,<br>{{organizationName}}</p>
        `,
        recipientEmail: "{{payload.customerEmail}}",
      },
    },

    // 14. Notify Account Manager
    {
      nodeId: "email-5",
      type: "EMAIL",
      name: "Notify Account Manager",
      executionOrder: 13,
      config: {
        subject:
          "Action Required: Invoice {{payload.invoiceNumber}} - 7 Days Overdue",
        htmlBody: `
          <h2>Overdue Invoice Alert</h2>
          <p>The following invoice has been overdue for 7+ days and requires your attention:</p>
          
          <ul>
            <li><strong>Customer:</strong> {{payload.customerName}}</li>
            <li><strong>Invoice Number:</strong> {{payload.invoiceNumber}}</li>
            <li><strong>Amount:</strong> {{payload.currency}} {{payload.totalAmount}}</li>
            <li><strong>Due Date:</strong> {{formatDate(payload.dueDate)}}</li>
            <li><strong>Days Overdue:</strong> {{daysOverdue}}</li>
          </ul>
          
          <p>Please follow up with the customer to resolve this outstanding payment.</p>
          
          <p><a href="{{appUrl}}/invoices/{{payload.id}}">View Invoice</a></p>
        `,
        recipientType: "account_manager",
      },
      isOptional: true,
    },
  ],

  connections: [
    {
      sourceNodeId: "trigger-1",
      targetNodeId: "condition-1",
      executionOrder: 0,
    },
    {
      sourceNodeId: "condition-1",
      targetNodeId: "create-payment-link-1",
      executionOrder: 1,
    },
    {
      sourceNodeId: "create-payment-link-1",
      targetNodeId: "email-1",
      executionOrder: 2,
    },
    {
      sourceNodeId: "email-1",
      targetNodeId: "delay-1",
      executionOrder: 3,
    },
    {
      sourceNodeId: "delay-1",
      targetNodeId: "condition-2",
      executionOrder: 4,
    },
    {
      sourceNodeId: "condition-2",
      targetNodeId: "email-2",
      executionOrder: 5,
    },
    {
      sourceNodeId: "email-2",
      targetNodeId: "delay-2",
      executionOrder: 6,
    },
    {
      sourceNodeId: "delay-2",
      targetNodeId: "condition-3",
      executionOrder: 7,
    },
    {
      sourceNodeId: "condition-3",
      targetNodeId: "email-3",
      executionOrder: 8,
    },
    {
      sourceNodeId: "email-3",
      targetNodeId: "delay-3",
      executionOrder: 9,
    },
    {
      sourceNodeId: "delay-3",
      targetNodeId: "condition-4",
      executionOrder: 10,
    },
    {
      sourceNodeId: "condition-4",
      targetNodeId: "email-4",
      executionOrder: 11,
    },
    {
      sourceNodeId: "email-4",
      targetNodeId: "email-5",
      executionOrder: 12,
    },
  ],

  variables: [
    {
      name: "paymentUrl",
      type: "string",
      description: "Stripe payment link URL",
    },
    {
      name: "daysOverdue",
      type: "number",
      description: "Number of days invoice is overdue",
    },
  ],
};
