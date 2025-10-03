# Workflow Templates

This directory contains pre-built workflow templates for the Agency Workflow Platform. These templates provide ready-to-use automation workflows for common agency operations.

## Available Templates

### 1. Lead-to-Client Auto-Setup

**ID:** `lead-to-client-auto-setup`  
**Category:** Sales & Onboarding  
**Trigger:** Deal Status Changed to CLOSED_WON

Automatically converts won deals to clients with complete project setup, including:

- Customer record creation
- Project creation with deal details
- Onboarding task checklist generation
- Draft invoice creation
- Notifications to project manager and account owner

### 2. Task Reminder and Escalation

**ID:** `task-reminder-escalation`  
**Category:** Project Management  
**Trigger:** Daily Schedule (9 AM)

Sends automatic reminders for upcoming and overdue tasks with escalation:

- 24-hour advance reminders for upcoming tasks
- Overdue notifications to assignees
- Escalation to project manager after 2 days overdue
- Escalation to department manager after 5 days overdue

### 3. Invoice Lifecycle Automation

**ID:** `invoice-lifecycle`  
**Category:** Finance  
**Trigger:** Invoice Status Changed

Manages complete invoice lifecycle from sending to payment collection:

- Stripe payment link generation
- Invoice email with payment instructions
- Payment reminder 3 days before due date
- Overdue notice on due date
- Second overdue notice after 7 days
- Account manager notification for overdue invoices

### 4. Project Kickoff Pack

**ID:** `project-kickoff-pack`  
**Category:** Project Management  
**Trigger:** Project Created

Generates complete onboarding checklist for new projects:

- Client onboarding call task
- Requirements gathering task
- Team assignment task
- Project setup task
- Kickoff meeting task with calendar event
- Documentation and communication plan tasks
- Notifications to project manager and team

### 5. Retainer/Recurring Invoice Automation

**ID:** `retainer-recurring-invoice`  
**Category:** Finance  
**Trigger:** Monthly Schedule (1st of month)

Automatically generates and sends invoices for retainer clients:

- Query active retainer clients
- Generate monthly invoices
- Send invoice emails to clients
- Update next invoice date

### 6. Project Health Monitoring

**ID:** `project-health-monitor`  
**Category:** Project Management  
**Trigger:** Daily Schedule (8 AM)

Daily automated health checks on active projects:

- Check for overdue tasks
- Monitor budget consumption (80% threshold)
- Detect milestone slippage
- Flag stale projects (no activity for 7 days)
- Compile and send health reports to stakeholders

### 7. Contract Renewal Reminder

**ID:** `contract-renewal-reminder`  
**Category:** Sales & Account Management  
**Trigger:** Daily Schedule (10 AM)

Automatic reminders for upcoming contract renewals:

- 30-day advance notification with renewal task creation
- 14-day reminder to account manager
- 7-day escalation to sales manager
- Tracks notification status to prevent duplicates

## Usage

### Importing Templates

```typescript
import {
  leadToClientAutoSetupTemplate,
  taskReminderEscalationTemplate,
  invoiceLifecycleTemplate,
  projectKickoffPackTemplate,
  retainerRecurringInvoiceTemplate,
  projectHealthMonitorTemplate,
  contractRenewalReminderTemplate,
  allWorkflowTemplates,
  getWorkflowTemplateById,
  getWorkflowTemplatesByCategory,
} from "~/lib/workflow-templates";
```

### Getting a Template by ID

```typescript
const template = getWorkflowTemplateById("invoice-lifecycle");
```

### Getting Templates by Category

```typescript
const financeTemplates = getWorkflowTemplatesByCategory("Finance");
```

### Template Structure

Each template includes:

- **id**: Unique identifier
- **name**: Display name
- **description**: Template description
- **category**: Template category
- **triggers**: Array of trigger configurations
- **nodes**: Array of workflow nodes
- **connections**: Array of node connections
- **variables**: Optional variable definitions

## Node Types Used

Templates utilize the following node types:

- **TRIGGER**: Workflow entry point
- **CONDITION**: Conditional branching
- **LOOP**: Iteration over collections
- **PARALLEL**: Concurrent execution
- **DATA_TRANSFORM**: Data querying and transformation
- **CREATE_RECORD**: Database record creation
- **UPDATE_RECORD**: Database record updates
- **EMAIL**: Email notifications
- **ACTION**: Custom actions (payment links, calendar events)
- **DELAY**: Time-based delays

## Testing

All templates include comprehensive test coverage:

```bash
# Run all template tests
bun test src/lib/workflow-templates/__tests__/

# Run specific template test
bun test src/lib/workflow-templates/__tests__/invoice-lifecycle.test.ts
```

## Customization

Templates can be customized by:

1. Modifying field mappings
2. Adjusting timing and delays
3. Changing notification recipients
4. Adding or removing nodes
5. Updating trigger conditions

## Requirements Mapping

Each template maps to specific requirements from the Agency Workflow Platform specification:

- **Lead-to-Client Auto-Setup**: Requirement 1
- **Task Reminder and Escalation**: Requirement 2
- **Invoice Lifecycle**: Requirement 3
- **Project Kickoff Pack**: Requirement 4
- **Retainer/Recurring Invoice**: Requirement 5
- **Project Health Monitoring**: Requirement 6
- **Contract Renewal Reminder**: Requirement 7

## Future Enhancements

Potential future templates:

- Employee onboarding workflow
- Expense approval workflow
- Time tracking reminders
- Client feedback collection
- Project milestone notifications
- Budget alert workflow
