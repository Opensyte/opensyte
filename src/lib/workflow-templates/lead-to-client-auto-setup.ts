/**
 * Lead-to-Client Auto-Setup Workflow Template
 *
 * Automatically converts won deals to clients with complete project setup.
 * Triggered when a deal status changes to CLOSED_WON.
 */

import type { WorkflowTemplate } from "./types";

export const leadToClientAutoSetupTemplate: WorkflowTemplate = {
  id: "lead-to-client-auto-setup",
  name: "Lead-to-Client Auto-Setup",
  description:
    "Automatically convert won deals to clients with complete project setup, onboarding tasks, and draft invoice",
  category: "Sales & Onboarding",

  triggers: [
    {
      type: "DEAL_STATUS_CHANGED",
      module: "CRM",
      entityType: "Deal",
      eventType: "DEAL_STATUS_CHANGED",
      conditions: {
        field: "status",
        operator: "equals",
        value: "CLOSED_WON",
      },
    },
  ],

  nodes: [
    // 1. Trigger Node
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Deal Status Changed to Won",
      executionOrder: 0,
      config: {},
    },

    // 2. Condition Node - Verify status is CLOSED_WON
    {
      nodeId: "condition-1",
      type: "CONDITION",
      name: "Check if Deal is Won",
      executionOrder: 1,
      config: {
        conditions: [
          {
            field: "payload.status",
            operator: "equals",
            value: "CLOSED_WON",
          },
        ],
        logicalOperator: "AND",
        trueBranch: "create-customer-1",
        falseBranch: null,
      },
    },

    // 3. Create Customer Record
    {
      nodeId: "create-customer-1",
      type: "CREATE_RECORD",
      name: "Create Client from Lead",
      executionOrder: 2,
      config: {
        model: "Customer",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          type: "CUSTOMER",
          status: null,
          firstName: "{{payload.customer.firstName}}",
          lastName: "{{payload.customer.lastName}}",
          email: "{{payload.customer.email}}",
          phone: "{{payload.customer.phone}}",
          company: "{{payload.customer.company}}",
          position: "{{payload.customer.position}}",
          address: "{{payload.customer.address}}",
          city: "{{payload.customer.city}}",
          state: "{{payload.customer.state}}",
          country: "{{payload.customer.country}}",
          postalCode: "{{payload.customer.postalCode}}",
          notes: "Converted from deal: {{payload.title}}",
        },
        outputVariable: "customerId",
      },
    },

    // 4. Create Project Record
    {
      nodeId: "create-project-1",
      type: "CREATE_RECORD",
      name: "Create Project from Deal",
      executionOrder: 3,
      config: {
        model: "Project",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          name: "{{payload.title}}",
          description: "{{payload.description}}",
          status: "PLANNED",
          budget: "{{payload.value}}",
          currency: "{{payload.currency}}",
          startDate: "{{now}}",
          createdById: "{{payload.createdById}}",
        },
        outputVariable: "projectId",
      },
    },

    // 5. Create Onboarding Tasks (Loop)
    {
      nodeId: "loop-1",
      type: "LOOP",
      name: "Create Onboarding Tasks",
      executionOrder: 4,
      config: {
        dataSource: "onboardingTasks",
        itemVariable: "task",
        maxIterations: 20,
        loopBodyNodeId: "create-task-1",
      },
    },

    // 6. Create Task Node (inside loop)
    {
      nodeId: "create-task-1",
      type: "CREATE_RECORD",
      name: "Create Onboarding Task",
      executionOrder: 5,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{projectId}}",
          title: "{{task.title}}",
          description: "{{task.description}}",
          status: "TODO",
          priority: "{{task.priority}}",
          dueDate: "{{task.dueDate}}",
          assignedToId: "{{task.assignedToId}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 7. Create Draft Invoice
    {
      nodeId: "create-invoice-1",
      type: "CREATE_RECORD",
      name: "Create Draft Invoice",
      executionOrder: 6,
      config: {
        model: "Invoice",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          customerId: "{{customerId}}",
          customerEmail: "{{payload.customer.email}}",
          customerName:
            "{{payload.customer.firstName}} {{payload.customer.lastName}}",
          customerAddress: "{{payload.customer.address}}",
          customerPhone: "{{payload.customer.phone}}",
          invoiceNumber: "INV-{{timestamp}}",
          status: "DRAFT",
          issueDate: "{{now}}",
          dueDate: "{{addDays(now, 30)}}",
          paymentTerms: "Net 30",
          subtotal: "{{payload.value}}",
          taxAmount: "0",
          discountAmount: "0",
          totalAmount: "{{payload.value}}",
          currency: "{{payload.currency}}",
          notes: "Invoice for project: {{payload.title}}",
          createdById: "{{payload.createdById}}",
        },
        outputVariable: "invoiceId",
      },
    },

    // 8. Notify Project Manager
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Notify Project Manager",
      executionOrder: 7,
      config: {
        subject: "New Client & Project Created: {{payload.title}}",
        htmlBody: `
          <h2>New Client Onboarding</h2>
          <p>A new client has been created from a won deal:</p>
          <ul>
            <li><strong>Client:</strong> {{payload.customer.firstName}} {{payload.customer.lastName}}</li>
            <li><strong>Company:</strong> {{payload.customer.company}}</li>
            <li><strong>Project:</strong> {{payload.title}}</li>
            <li><strong>Budget:</strong> {{payload.currency}} {{payload.value}}</li>
          </ul>
          <p>Onboarding tasks have been created and a draft invoice is ready for review.</p>
          <p><a href="{{appUrl}}/projects/{{projectId}}">View Project</a></p>
        `,
        recipientType: "project_manager",
      },
      isOptional: true,
    },

    // 9. Notify Account Owner
    {
      nodeId: "email-2",
      type: "EMAIL",
      name: "Notify Account Owner",
      executionOrder: 8,
      config: {
        subject: "Deal Won - Client Setup Complete: {{payload.title}}",
        htmlBody: `
          <h2>Congratulations on Closing the Deal!</h2>
          <p>Your deal has been won and the client setup is complete:</p>
          <ul>
            <li><strong>Client:</strong> {{payload.customer.firstName}} {{payload.customer.lastName}}</li>
            <li><strong>Deal Value:</strong> {{payload.currency}} {{payload.value}}</li>
            <li><strong>Project:</strong> {{payload.title}}</li>
          </ul>
          <p>The project is ready to begin with onboarding tasks assigned.</p>
          <p><a href="{{appUrl}}/projects/{{projectId}}">View Project</a></p>
        `,
        recipientType: "account_owner",
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
      targetNodeId: "create-customer-1",
      executionOrder: 1,
    },
    {
      sourceNodeId: "create-customer-1",
      targetNodeId: "create-project-1",
      executionOrder: 2,
    },
    {
      sourceNodeId: "create-project-1",
      targetNodeId: "loop-1",
      executionOrder: 3,
    },
    {
      sourceNodeId: "loop-1",
      targetNodeId: "create-invoice-1",
      executionOrder: 4,
    },
    {
      sourceNodeId: "create-invoice-1",
      targetNodeId: "email-1",
      executionOrder: 5,
    },
    {
      sourceNodeId: "email-1",
      targetNodeId: "email-2",
      executionOrder: 6,
    },
  ],

  variables: [
    {
      name: "customerId",
      type: "string",
      description: "ID of the created customer record",
    },
    {
      name: "projectId",
      type: "string",
      description: "ID of the created project record",
    },
    {
      name: "invoiceId",
      type: "string",
      description: "ID of the created invoice record",
    },
    {
      name: "onboardingTasks",
      type: "array",
      description: "Array of onboarding tasks to create",
      defaultValue: [
        {
          title: "Client Onboarding Call",
          description:
            "Schedule and conduct initial onboarding call with client",
          priority: "HIGH",
          dueDate: "{{addDays(now, 2)}}",
        },
        {
          title: "Gather Requirements",
          description: "Collect detailed project requirements from client",
          priority: "HIGH",
          dueDate: "{{addDays(now, 3)}}",
        },
        {
          title: "Assign Team Members",
          description: "Assign appropriate team members to the project",
          priority: "MEDIUM",
          dueDate: "{{addDays(now, 3)}}",
        },
        {
          title: "Schedule Kickoff Meeting",
          description: "Schedule project kickoff meeting with all stakeholders",
          priority: "HIGH",
          dueDate: "{{addDays(now, 5)}}",
        },
        {
          title: "Set Up Project Tools",
          description:
            "Configure project management tools and communication channels",
          priority: "MEDIUM",
          dueDate: "{{addDays(now, 5)}}",
        },
      ],
    },
  ],
};
