/**
 * Project Kickoff Pack Workflow Template
 *
 * Automatically generates a complete onboarding checklist when a new project is created.
 * Triggered when a project is created.
 */

import type { WorkflowTemplate } from "./types";

export const projectKickoffPackTemplate: WorkflowTemplate = {
  id: "project-kickoff-pack",
  name: "Project Kickoff Pack",
  description:
    "Automatically generate onboarding checklist, assign tasks, and schedule kickoff meeting for new projects",
  category: "Project Management",

  triggers: [
    {
      type: "PROJECT_CREATED",
      module: "PROJECTS",
      entityType: "Project",
      eventType: "PROJECT_CREATED",
    },
  ],

  nodes: [
    // 1. Trigger Node
    {
      nodeId: "trigger-1",
      type: "TRIGGER",
      name: "Project Created",
      executionOrder: 0,
      config: {},
    },

    // 2. Create Client Onboarding Task
    {
      nodeId: "create-task-1",
      type: "CREATE_RECORD",
      name: "Create Client Onboarding Task",
      executionOrder: 1,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Client Onboarding Call",
          description:
            "Schedule and conduct initial onboarding call with client to review project scope, timeline, and expectations",
          status: "TODO",
          priority: "HIGH",
          dueDate: "{{addDays(now, 2)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 3. Create Requirements Gathering Task
    {
      nodeId: "create-task-2",
      type: "CREATE_RECORD",
      name: "Create Requirements Gathering Task",
      executionOrder: 2,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Gather Detailed Requirements",
          description:
            "Collect comprehensive project requirements including technical specifications, design preferences, and success criteria",
          status: "TODO",
          priority: "HIGH",
          dueDate: "{{addDays(now, 3)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 4. Create Team Assignment Task
    {
      nodeId: "create-task-3",
      type: "CREATE_RECORD",
      name: "Create Team Assignment Task",
      executionOrder: 3,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Assign Team Members",
          description:
            "Identify and assign appropriate team members based on project requirements and team availability",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "{{addDays(now, 3)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 5. Create Project Setup Task
    {
      nodeId: "create-task-4",
      type: "CREATE_RECORD",
      name: "Create Project Setup Task",
      executionOrder: 4,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Set Up Project Tools & Environment",
          description:
            "Configure project management tools, communication channels, repositories, and development environments",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "{{addDays(now, 5)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 6. Create Kickoff Meeting Task
    {
      nodeId: "create-task-5",
      type: "CREATE_RECORD",
      name: "Create Kickoff Meeting Task",
      executionOrder: 5,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Schedule Project Kickoff Meeting",
          description:
            "Organize and conduct project kickoff meeting with all stakeholders to align on goals, timeline, and deliverables",
          status: "TODO",
          priority: "HIGH",
          dueDate: "{{addDays(now, 5)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
        outputVariable: "kickoffTaskId",
      },
    },

    // 7. Create Calendar Event for Kickoff
    {
      nodeId: "create-calendar-1",
      type: "ACTION",
      name: "Create Kickoff Meeting Calendar Event",
      executionOrder: 6,
      config: {
        actionType: "create_calendar_event",
        title: "Project Kickoff: {{payload.name}}",
        description:
          "Project kickoff meeting for {{payload.name}}. Review project scope, timeline, team roles, and next steps.",
        startTime: "{{addDays(now, 5)}}",
        duration: 60, // minutes
        attendees: ["{{payload.createdById}}"],
        location: "Virtual Meeting",
        outputVariable: "calendarEventId",
      },
      isOptional: true,
    },

    // 8. Create Documentation Task
    {
      nodeId: "create-task-6",
      type: "CREATE_RECORD",
      name: "Create Documentation Task",
      executionOrder: 7,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Create Project Documentation",
          description:
            "Set up project documentation including README, technical specs, and project wiki",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "{{addDays(now, 7)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 9. Create Communication Plan Task
    {
      nodeId: "create-task-7",
      type: "CREATE_RECORD",
      name: "Create Communication Plan Task",
      executionOrder: 8,
      config: {
        model: "Task",
        fieldMappings: {
          organizationId: "{{payload.organizationId}}",
          projectId: "{{payload.id}}",
          title: "Establish Communication Plan",
          description:
            "Define communication channels, meeting schedules, and reporting cadence with client and team",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "{{addDays(now, 7)}}",
          assignedToId: "{{payload.createdById}}",
          createdById: "{{payload.createdById}}",
        },
      },
    },

    // 10. Notify Project Manager
    {
      nodeId: "email-1",
      type: "EMAIL",
      name: "Notify Project Manager",
      executionOrder: 9,
      config: {
        subject: "New Project Created: {{payload.name}}",
        htmlBody: `
          <h2>New Project: {{payload.name}}</h2>
          <p>A new project has been created and the kickoff pack has been generated.</p>
          
          <h3>Project Details</h3>
          <ul>
            <li><strong>Project Name:</strong> {{payload.name}}</li>
            <li><strong>Description:</strong> {{payload.description}}</li>
            <li><strong>Status:</strong> {{payload.status}}</li>
            <li><strong>Budget:</strong> {{payload.currency}} {{payload.budget}}</li>
            <li><strong>Start Date:</strong> {{formatDate(payload.startDate)}}</li>
          </ul>

          <h3>Kickoff Tasks Created</h3>
          <ol>
            <li>Client Onboarding Call (Due: {{formatDate(addDays(now, 2))}})</li>
            <li>Gather Detailed Requirements (Due: {{formatDate(addDays(now, 3))}})</li>
            <li>Assign Team Members (Due: {{formatDate(addDays(now, 3))}})</li>
            <li>Set Up Project Tools (Due: {{formatDate(addDays(now, 5))}})</li>
            <li>Schedule Kickoff Meeting (Due: {{formatDate(addDays(now, 5))}})</li>
            <li>Create Project Documentation (Due: {{formatDate(addDays(now, 7))}})</li>
            <li>Establish Communication Plan (Due: {{formatDate(addDays(now, 7))}})</li>
          </ol>

          <p><a href="{{appUrl}}/projects/{{payload.id}}">View Project</a></p>
          
          <p>Please review the tasks and adjust assignments as needed.</p>
        `,
        recipientType: "project_manager",
      },
      isOptional: true,
    },

    // 11. Notify Team Members
    {
      nodeId: "email-2",
      type: "EMAIL",
      name: "Notify Team Members",
      executionOrder: 10,
      config: {
        subject: "You've Been Added to Project: {{payload.name}}",
        htmlBody: `
          <h2>Welcome to {{payload.name}}</h2>
          <p>You have been added to a new project.</p>
          
          <h3>Project Overview</h3>
          <ul>
            <li><strong>Project:</strong> {{payload.name}}</li>
            <li><strong>Description:</strong> {{payload.description}}</li>
            <li><strong>Start Date:</strong> {{formatDate(payload.startDate)}}</li>
          </ul>

          <p>A kickoff meeting has been scheduled for {{formatDate(addDays(now, 5))}}. Please review the project details and prepare any questions.</p>

          <p><a href="{{appUrl}}/projects/{{payload.id}}">View Project Details</a></p>
          
          <p>Looking forward to working with you on this project!</p>
        `,
        recipientType: "team_members",
      },
      isOptional: true,
    },

    // 12. Condition - Check if all kickoff tasks completed
    {
      nodeId: "condition-1",
      type: "CONDITION",
      name: "Check if All Kickoff Tasks Completed",
      executionOrder: 11,
      config: {
        conditions: [
          {
            field: "project.kickoffTasksCompleted",
            operator: "equals",
            value: true,
          },
        ],
        logicalOperator: "AND",
        trueBranch: "update-project-1",
        falseBranch: null,
      },
    },

    // 13. Update Project Status to IN_PROGRESS
    {
      nodeId: "update-project-1",
      type: "UPDATE_RECORD",
      name: "Update Project Status",
      executionOrder: 12,
      config: {
        model: "Project",
        recordId: "{{payload.id}}",
        fieldMappings: {
          status: "IN_PROGRESS",
        },
      },
    },

    // 14. Notify PM of Status Change
    {
      nodeId: "email-3",
      type: "EMAIL",
      name: "Notify PM of Status Change",
      executionOrder: 13,
      config: {
        subject: "Project {{payload.name}} - Kickoff Complete",
        htmlBody: `
          <h2>Project Kickoff Complete</h2>
          <p>All kickoff tasks for {{payload.name}} have been completed.</p>
          
          <p>The project status has been updated to <strong>IN PROGRESS</strong>.</p>

          <p><a href="{{appUrl}}/projects/{{payload.id}}">View Project</a></p>
          
          <p>The team is ready to begin work on deliverables.</p>
        `,
        recipientType: "project_manager",
      },
      isOptional: true,
    },
  ],

  connections: [
    {
      sourceNodeId: "trigger-1",
      targetNodeId: "create-task-1",
      executionOrder: 0,
    },
    {
      sourceNodeId: "create-task-1",
      targetNodeId: "create-task-2",
      executionOrder: 1,
    },
    {
      sourceNodeId: "create-task-2",
      targetNodeId: "create-task-3",
      executionOrder: 2,
    },
    {
      sourceNodeId: "create-task-3",
      targetNodeId: "create-task-4",
      executionOrder: 3,
    },
    {
      sourceNodeId: "create-task-4",
      targetNodeId: "create-task-5",
      executionOrder: 4,
    },
    {
      sourceNodeId: "create-task-5",
      targetNodeId: "create-calendar-1",
      executionOrder: 5,
    },
    {
      sourceNodeId: "create-calendar-1",
      targetNodeId: "create-task-6",
      executionOrder: 6,
    },
    {
      sourceNodeId: "create-task-6",
      targetNodeId: "create-task-7",
      executionOrder: 7,
    },
    {
      sourceNodeId: "create-task-7",
      targetNodeId: "email-1",
      executionOrder: 8,
    },
    {
      sourceNodeId: "email-1",
      targetNodeId: "email-2",
      executionOrder: 9,
    },
    // Condition check happens separately when tasks are completed
  ],

  variables: [
    {
      name: "kickoffTaskId",
      type: "string",
      description: "ID of the kickoff meeting task",
    },
    {
      name: "calendarEventId",
      type: "string",
      description: "ID of the created calendar event",
    },
  ],
};
