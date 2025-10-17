import { PERMISSIONS } from "~/lib/rbac";

export type PrebuiltWorkflowKey =
  | "lead-to-client"
  | "client-onboarding"
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
  "Thanks for choosing {{companyName}}. Your dedicated team just converted your account and prepared everything you need to get started.",
  "",
  "Here is what happens next:",
  "- Kickoff tasks are already queued in your onboarding workspace.",
  "- You can access the shared folder here: {{projectFolderLink}}.",
  "- Your point of contact is {{accountManagerName}} ({{accountManagerEmail}}).",
  "",
  "If you have any questions, simply reply to this email and we will help right away.",
  "",
  "Looking forward to working together!",
  "{{accountManagerName}}",
  "{{companyName}} onboarding team",
].join("\n");

const clientOnboardingEmailBody = [
  "Hi {{clientName}},",
  "",
  "We are excited to kick off your onboarding journey. To keep everything on track we prepared three quick actions for you:",
  "1. Review the contract draft: {{contractLink}}.",
  "2. Upload any kickoff documents at {{documentPortalLink}}.",
  "3. Confirm your preferred payment method using {{paymentSetupLink}}.",
  "",
  "Your onboarding lead {{onboardingOwnerName}} will follow up within one business day. Feel free to reply to this message if anything comes up.",
  "",
  "Welcome aboard!",
  "{{onboardingOwnerName}}",
  "{{companyName}}",
].join("\n");

const projectLifecycleEmailBody = [
  "Hello {{clientName}},",
  "",
  "We just opened your project board and assigned the delivery team. You can follow progress at {{projectBoardLink}}.",
  "",
  "Status overview:",
  "- Owner: {{projectOwnerName}}",
  "- Current stage: {{projectStage}}",
  "- Upcoming milestone: {{nextMilestoneName}} due {{nextMilestoneDueDate}}",
  "",
  "We will keep you updated as soon as tasks move to Done and when the invoice is ready.",
  "",
  "Thank you,",
  "{{projectOwnerName}}",
  "{{companyName}} projects team",
].join("\n");

const invoiceTrackingEmailBody = [
  "Hi {{clientName}},",
  "",
  "Great news: your project {{projectName}} wrapped up and the invoice {{invoiceNumber}} is ready.",
  "",
  "Amount due: {{invoiceAmount}}",
  "Due date: {{invoiceDueDate}}",
  "Pay online: {{invoicePaymentLink}}",
  "",
  "We will automatically follow up if payment is still pending after {{reminderDays}} days. Marking the invoice as paid will close out the workflow.",
  "",
  "Thank you for your partnership!",
  "{{financeOwnerName}}",
  "{{companyName}} finance team",
].join("\n");

const contractRenewalEmailBody = [
  "Hello {{clientName}},",
  "",
  "Your current agreement for {{serviceName}} renews on {{renewalDate}}. To keep coverage active we prepared everything in advance.",
  "",
  "Next steps:",
  "- Review the renewal summary: {{renewalSummaryLink}}.",
  "- Confirm any scope changes with {{accountManagerName}}.",
  "- Review the draft invoice here: {{invoiceDraftLink}}.",
  "",
  "Please let us know if you would like to adjust anything. Otherwise, we will send the final invoice on {{invoiceSendDate}}.",
  "",
  "Appreciate your continued trust,",
  "{{accountManagerName}}",
  "{{companyName}}",
].join("\n");

const internalHealthEmailBody = [
  "Hi team,",
  "",
  "Here is your weekly operations snapshot:",
  "",
  "- Open projects: {{currentProjectCount}}",
  "- Projects at risk: {{projectsAtRiskCount}}",
  "- Overdue invoices: {{overdueInvoiceCount}}",
  "- Active clients: {{activeClientCount}}",
  "",
  "Highlights:",
  "{{topInsightLineOne}}",
  "{{topInsightLineTwo}}",
  "",
  "Focus for next week:",
  "- {{focusAreaOne}}",
  "- {{focusAreaTwo}}",
  "",
  "Keep up the great work!",
  "{{operationsLeadName}}",
].join("\n");

export const PREBUILT_WORKFLOWS: PrebuiltWorkflowDefinition[] = [
  {
    key: "lead-to-client",
    title: "Lead -> Client Conversion",
    shortDescription: "One-click conversion that creates the client record, onboarding project, and updates the pipeline.",
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
    requiredPermissions: [
      PERMISSIONS.CRM_WRITE,
      PERMISSIONS.PROJECTS_WRITE,
    ],
    highlight: "Reduce lead-to-client handoff time and keep sales to delivery transitions consistent.",
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
    key: "client-onboarding",
    title: "Client Onboarding",
    shortDescription: "Assign kickoff tasks, generate the contract template, and notify the team when a client is added.",
    overview:
      "Standardize the onboarding journey every time a new client record is created. Contracts, tasks, and notifications run instantly so the team stays aligned.",
    trigger: "When a client record is created in CRM.",
    actions: [
      "Generate the contract template and attach it to the client",
      "Assign kickoff tasks like document upload and payment setup",
      "Send an internal notification to the onboarding owner",
    ],
    category: "CRM",
    moduleDependencies: ["CRM", "Projects"],
    requiredPermissions: [
      PERMISSIONS.CRM_WRITE,
      PERMISSIONS.PROJECTS_WRITE,
    ],
    highlight: "Give every client a polished onboarding experience with zero manual steps.",
    icon: "Handshake",
    emailDefaults: {
      subject: "Welcome aboard - onboarding steps inside",
      body: clientOnboardingEmailBody,
      variables: [
        {
          token: "clientName",
          label: "Client name",
          description: "Primary contact full name",
        },
        {
          token: "contractLink",
          label: "Contract link",
          description: "Generated contract template URL",
        },
        {
          token: "documentPortalLink",
          label: "Document portal link",
          description: "Upload folder or portal URL",
        },
        {
          token: "paymentSetupLink",
          label: "Payment setup link",
          description: "Payment onboarding page",
        },
        {
          token: "onboardingOwnerName",
          label: "Onboarding owner name",
          description: "Team member owning onboarding",
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
    key: "project-lifecycle",
    title: "Project Lifecycle",
    shortDescription: "Launch the project board, assign the team, and prep invoicing once work is marked complete.",
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
    shortDescription: "Send the invoice when projects close and follow up automatically until payment arrives.",
    overview:
      "Automate invoicing for completed projects, monitor overdue balances, and gently nudge clients until payments post.",
    trigger: "When a project is marked as completed.",
    actions: [
      "Create the invoice using the project total",
      "Send the initial payment email to the client",
      "Schedule follow-up reminders after X days if unpaid",
      "Close the workflow when the invoice is marked paid",
    ],
    category: "Finance",
    moduleDependencies: ["Finance", "Projects"],
    requiredPermissions: [
      PERMISSIONS.FINANCE_WRITE,
      PERMISSIONS.PROJECTS_READ,
    ],
    highlight: "Never let an invoice slip through the cracks again.",
    icon: "Receipt",
    emailDefaults: {
      subject: "Invoice {{invoiceNumber}} for {{projectName}}",
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
          description: "Reference number",
        },
        {
          token: "invoiceAmount",
          label: "Invoice amount",
          description: "Amount due",
        },
        {
          token: "invoiceDueDate",
          label: "Invoice due date",
          description: "Due date text",
        },
        {
          token: "invoicePaymentLink",
          label: "Payment link",
          description: "URL for payment",
        },
        {
          token: "reminderDays",
          label: "Reminder days",
          description: "Number of days before reminder",
        },
        {
          token: "financeOwnerName",
          label: "Finance owner name",
          description: "Team member sending the invoice",
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
    shortDescription: "Alert the team ahead of renewals, email the client, and queue the draft invoice.",
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
    requiredPermissions: [
      PERMISSIONS.FINANCE_WRITE,
      PERMISSIONS.CRM_READ,
    ],
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
          token: "invoiceDraftLink",
          label: "Invoice draft link",
          description: "Draft invoice URL",
        },
        {
          token: "invoiceSendDate",
          label: "Invoice send date",
          description: "Planned send date",
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
    shortDescription: "Send a Friday summary of workload, revenue blockers, and client counts to the leadership team.",
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
    highlight: "Give leadership proactive visibility without logging into dashboards.",
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
          token: "operationsLeadName",
          label: "Operations lead name",
          description: "Sender name",
        },
      ],
    },
  },
];

export const PREBUILT_WORKFLOW_KEYS = PREBUILT_WORKFLOWS.map(
  workflow => workflow.key
) satisfies ReadonlyArray<PrebuiltWorkflowKey>;