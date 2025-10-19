import { PERMISSIONS } from "~/lib/rbac";

export type PrebuiltWorkflowKey =
  | "lead-to-client"
  | "project-lifecycle"
  | "invoice-tracking"
  | "contract-renewal"
  | "internal-health";

export interface TemplateVariable {
  token: string;
  label: string;
  description: string;
}

export interface PrebuiltWorkflowDefinition {
  key: PrebuiltWorkflowKey;
  title: string;
  shortDescription: string;
  overview: string;
  trigger: string;
  actions: string[];
  category: "CRM" | "Finance" | "Projects" | "Operations";
  moduleDependencies: string[];
  requiredPermissions: string[];
  highlight: string;
  icon: string;
  emailDefaults: {
    subject: string;
    body: string;
    variables: TemplateVariable[];
  };
}

const leadToClientEmailBody = [
  "Hi {{clientName}},",
  "",
  "Great news! Your account has been qualified and we're excited to move forward with you.",
  "",
  "We've set up your onboarding project with all the necessary tasks to help you get started smoothly.",
  "",
  "Your dedicated account manager {{accountManagerName}} will reach out shortly to schedule your kickoff call and answer any questions.",
  "",
  "Welcome to {{companyName}}!",
  "",
  "Best regards,",
  "{{accountManagerName}}",
  "{{companyName}} Team",
].join("\n");

const projectLifecycleEmailBody = [
  "Hello {{clientName}},",
  "",
  "Great news! We've opened your project board and assigned the delivery team.",
  "",
  "Project Overview:",
  "• Owner: {{projectOwnerName}}",
  "• Current stage: {{projectStage}}",
  "• Upcoming milestone: {{nextMilestoneName}} due {{nextMilestoneDueDate}}",
  "",
  "We'll keep you updated as tasks are completed and when the invoice is ready.",
  "",
  "Best regards,",
  "{{projectOwnerName}}",
  "{{companyName}} Projects Team",
].join("\n");

const invoiceTrackingEmailBody = [
  "Hi {{clientName}},",
  "",
  "Excellent news! We've completed your project {{projectName}} and your invoice is ready for review.",
  "",
  "Invoice Details:",
  "• Invoice Number: {{invoiceNumber}}",
  "• Amount: {{invoiceAmount}}",
  "• Due Date: {{invoiceDueDate}}",
  "• Status: {{invoiceStatus}}",
  "",
  "You can view and pay your invoice here: {{invoiceLink}}",
  "",
  "If you have any questions about this invoice, please don't hesitate to reach out.",
  "",
  "Thank you for your business!",
  "",
  "Best regards,",
  "{{financeOwnerName}}",
  "{{companyName}} Finance Team",
].join("\n");

const contractRenewalEmailBody = [
  "Hello {{clientName}},",
  "",
  "Your current agreement for {{serviceName}} renews on {{renewalDate}}. We've prepared everything in advance to ensure seamless continuity.",
  "",
  "Renewal Details:",
  "• Renewal total: {{renewalAmount}}",
  "• Invoice {{invoiceNumber}}: {{invoiceAmount}}",
  "• Invoice send date: {{invoiceSendDate}}",
  "",
  "Your account manager {{accountManagerName}} is available to discuss any scope changes or answer questions.",
  "",
  "Please let us know if you'd like to adjust anything before we finalize the invoice.",
  "",
  "Thank you for your continued trust!",
  "",
  "Best regards,",
  "{{accountManagerName}}",
  "{{companyName}}",
].join("\n");

const internalHealthEmailBody = [
  "Hi team,",
  "",
  "Here's your weekly operations snapshot:",
  "",
  "Metrics Overview:",
  "• Open projects: {{currentProjectCount}}",
  "• Projects at risk: {{projectsAtRiskCount}}",
  "• Overdue invoices: {{overdueInvoiceCount}}",
  "• Active clients: {{activeClientCount}}",
  "",
  "Key Insights:",
  "{{topInsightLineOne}}",
  "{{topInsightLineTwo}}",
  "",
  "Focus for next week:",
  "• {{focusAreaOne}}",
  "• {{focusAreaTwo}}",
  "",
  "Let's keep the momentum going!",
  "",
  "Best regards,",
  "{{operationsLeadName}}",
  "{{companyName}} Operations Team",
].join("\n");

export const PREBUILT_WORKFLOWS: PrebuiltWorkflowDefinition[] = [
  {
    key: "lead-to-client",
    title: "Lead -> Client Conversion",
    shortDescription:
      "One-click conversion that creates the client record, onboarding project, and updates the pipeline.",
    overview:
      "Automatically convert a qualified lead into a client, create the onboarding project folder, and update CRM pipeline stages without manual handoffs.",
    trigger: "When a new CRM lead moves into the Qualified stage.",
    actions: [
      "Create or update the client record in CRM",
      "Spin up a default project workspace with tasks",
      "Trigger the onboarding workflow and notifications",
      "Move the lead into the Client stage with status tracking",
    ],
    category: "CRM",
    moduleDependencies: ["CRM", "Projects"],
    requiredPermissions: [PERMISSIONS.CRM_WRITE, PERMISSIONS.PROJECTS_WRITE],
    highlight:
      "Reduce lead-to-client handoff time and keep sales to delivery transitions consistent.",
    icon: "Sparkles",
    emailDefaults: {
      subject: "Welcome to {{companyName}} - your onboarding is ready",
      body: leadToClientEmailBody,
      variables: [
        {
          token: "clientName",
          label: "Client name",
          description: "Primary contact full name",
        },
        {
          token: "companyName",
          label: "Company name",
          description: "Your organization name",
        },
        {
          token: "projectFolderLink",
          label: "Project folder link",
          description: "Shared folder or drive link for the client",
        },
        {
          token: "accountManagerName",
          label: "Account manager name",
          description: "Primary owner of the client relationship",
        },
        {
          token: "accountManagerEmail",
          label: "Account manager email",
          description: "Contact email for follow-up",
        },
      ],
    },
  },
  {
    key: "project-lifecycle",
    title: "Project Lifecycle",
    shortDescription:
      "Launch the project board, assign the team, and prep invoicing once work is marked complete.",
    overview:
      "Keep every delivery consistent by generating the project structure, assigning the team, and queuing invoicing the moment work finishes.",
    trigger: "When a new project is created.",
    actions: [
      "Create the default task board (To Do -> Doing -> Done)",
      "Assign the owner and default delivery team",
      "Generate the invoice when the project reaches Done",
    ],
    category: "Projects",
    moduleDependencies: ["Projects", "Finance"],
    requiredPermissions: [
      PERMISSIONS.PROJECTS_WRITE,
      PERMISSIONS.FINANCE_WRITE,
    ],
    highlight: "Make kickoff-to-invoice seamless with a ready-made lifecycle.",
    icon: "ClipboardList",
    emailDefaults: {
      subject: "Project {{projectName}} is in motion",
      body: projectLifecycleEmailBody,
      variables: [
        {
          token: "clientName",
          label: "Client name",
          description: "Client receiving the update",
        },
        {
          token: "projectBoardLink",
          label: "Project board link",
          description: "Link to the project board",
        },
        {
          token: "projectOwnerName",
          label: "Project owner name",
          description: "Assigned owner",
        },
        {
          token: "projectStage",
          label: "Project stage",
          description: "Current stage label",
        },
        {
          token: "nextMilestoneName",
          label: "Next milestone",
          description: "Name of the upcoming milestone",
        },
        {
          token: "nextMilestoneDueDate",
          label: "Next milestone due date",
          description: "Due date text",
        },
        {
          token: "companyName",
          label: "Company name",
          description: "Your organization name",
        },
      ],
    },
  },
  {
    key: "invoice-tracking",
    title: "Invoice & Payment Tracking",
    shortDescription:
      "Automatically create and send invoices when projects are completed.",
    overview:
      "Streamline your billing process by automatically creating invoices when projects are marked as complete and notifying clients with payment details.",
    trigger: "When a project is marked as completed.",
    actions: [
      "Create the invoice using the project budget",
      "Send the invoice notification email to the client",
    ],
    category: "Finance",
    moduleDependencies: ["Finance", "Projects"],
    requiredPermissions: [PERMISSIONS.FINANCE_WRITE, PERMISSIONS.PROJECTS_READ],
    highlight: "Automate billing and get paid faster with instant invoicing.",
    icon: "Receipt",
    emailDefaults: {
      subject: "Invoice ready for {{projectName}}",
      body: invoiceTrackingEmailBody,
      variables: [
        {
          token: "clientName",
          label: "Client name",
          description: "Billing contact name",
        },
        {
          token: "projectName",
          label: "Project name",
          description: "Completed project name",
        },
        {
          token: "invoiceNumber",
          label: "Invoice number",
          description: "Generated invoice reference number",
        },
        {
          token: "invoiceAmount",
          label: "Invoice amount",
          description: "Total amount due with currency",
        },
        {
          token: "invoiceDueDate",
          label: "Invoice due date",
          description: "Payment due date",
        },
        {
          token: "invoiceStatus",
          label: "Invoice status",
          description: "Current invoice status (Draft, Sent, etc.)",
        },
        {
          token: "invoiceLink",
          label: "Invoice link",
          description: "Direct link to view the invoice",
        },
        {
          token: "financeOwnerName",
          label: "Finance owner name",
          description: "Team member responsible for billing",
        },
        {
          token: "companyName",
          label: "Company name",
          description: "Your organization name",
        },
      ],
    },
  },
  {
    key: "contract-renewal",
    title: "Contract Renewal / Retainer",
    shortDescription:
      "Alert the team ahead of renewals, email the client, and queue the draft invoice.",
    overview:
      "Stay ahead of renewal deadlines by automatically alerting owners, preparing client communication, and drafting renewal invoices.",
    trigger: "15 days before a renewal date for a retained client.",
    actions: [
      "Alert the account manager before the renewal window",
      "Send the renewal email with summary and invoice draft",
      "Update CRM stage once the renewal is confirmed",
    ],
    category: "Finance",
    moduleDependencies: ["Finance", "CRM"],
    requiredPermissions: [PERMISSIONS.FINANCE_WRITE, PERMISSIONS.CRM_READ],
    highlight: "Never miss a renewal commitment and keep revenue predictable.",
    icon: "RefreshCw",
    emailDefaults: {
      subject: "Renewal coming up on {{renewalDate}}",
      body: contractRenewalEmailBody,
      variables: [
        {
          token: "clientName",
          label: "Client name",
          description: "Retained client contact",
        },
        {
          token: "serviceName",
          label: "Service name",
          description: "Service or retainer name",
        },
        {
          token: "renewalDate",
          label: "Renewal date",
          description: "Date of renewal",
        },
        {
          token: "renewalSummaryLink",
          label: "Renewal summary link",
          description: "Link to summary document",
        },
        {
          token: "accountManagerName",
          label: "Account manager name",
          description: "Owner of the relationship",
        },
        {
          token: "accountManagerEmail",
          label: "Account manager email",
          description: "Owner contact email",
        },
        {
          token: "invoiceDraftLink",
          label: "Invoice draft link",
          description: "Draft invoice URL",
        },
        {
          token: "invoiceNumber",
          label: "Invoice number",
          description: "Draft invoice reference",
        },
        {
          token: "invoiceSendDate",
          label: "Invoice send date",
          description: "Planned send date",
        },
        {
          token: "renewalAmount",
          label: "Renewal amount",
          description: "Total value of the renewal",
        },
        {
          token: "invoiceAmount",
          label: "Invoice amount",
          description: "Amount on the draft invoice",
        },
        {
          token: "companyName",
          label: "Company name",
          description: "Your organization name",
        },
      ],
    },
  },
  {
    key: "internal-health",
    title: "Internal Health Dashboard",
    shortDescription:
      "Send a Friday summary of workload, revenue blockers, and client counts to the leadership team.",
    overview:
      "Give leadership a consistent weekly briefing on projects, invoices, and client health without manual reporting.",
    trigger: "Every Friday at 9am organization timezone.",
    actions: [
      "Aggregate project, client, and invoice stats",
      "Generate the summary message with highlights",
      "Email the distribution list with key focus areas",
    ],
    category: "Operations",
    moduleDependencies: ["Projects", "Finance", "CRM"],
    requiredPermissions: [
      PERMISSIONS.PROJECTS_READ,
      PERMISSIONS.FINANCE_READ,
      PERMISSIONS.CRM_READ,
    ],
    highlight:
      "Give leadership proactive visibility without logging into dashboards.",
    icon: "BarChart3",
    emailDefaults: {
      subject: "Weekly operations snapshot",
      body: internalHealthEmailBody,
      variables: [
        {
          token: "currentProjectCount",
          label: "Current project count",
          description: "Number of open projects",
        },
        {
          token: "projectsAtRiskCount",
          label: "Projects at risk",
          description: "Projects flagged as at risk",
        },
        {
          token: "overdueInvoiceCount",
          label: "Overdue invoice count",
          description: "Invoices beyond due date",
        },
        {
          token: "activeClientCount",
          label: "Active client count",
          description: "Active client total",
        },
        {
          token: "topInsightLineOne",
          label: "Top insight line one",
          description: "First highlight line",
        },
        {
          token: "topInsightLineTwo",
          label: "Top insight line two",
          description: "Second highlight line",
        },
        {
          token: "focusAreaOne",
          label: "Focus area one",
          description: "First priority for next week",
        },
        {
          token: "focusAreaTwo",
          label: "Focus area two",
          description: "Second priority for next week",
        },
        {
          token: "healthDashboardLink",
          label: "Health dashboard link",
          description: "Link to live operations dashboard",
        },
        {
          token: "operationsLeadName",
          label: "Operations lead name",
          description: "Sender name",
        },
        {
          token: "operationsLeadEmail",
          label: "Operations lead email",
          description: "Sender contact email",
        },
      ],
    },
  },
];

export const PREBUILT_WORKFLOW_KEYS = PREBUILT_WORKFLOWS.map(
  workflow => workflow.key
) satisfies ReadonlyArray<PrebuiltWorkflowKey>;
