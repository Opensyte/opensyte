export const WORKFLOW_FIELD_OPTIONS = [
  {
    value: "payload.status",
    label: "Payload status",
    description: "Status value supplied by the trigger payload.",
  },
  {
    value: "payload.type",
    label: "Payload type",
    description: "Type or category field from the trigger payload.",
  },
  {
    value: "payload.ownerId",
    label: "Payload owner ID",
    description: "Owner identifier included in the payload.",
  },
  {
    value: "context.organizationId",
    label: "Organization ID",
    description: "Current organization scope for this workflow run.",
  },
  {
    value: "previousStep.result.status",
    label: "Previous step status",
    description: "Status returned by the last executed node.",
  },
  {
    value: "workflow.variables.priority",
    label: "Workflow variable priority",
    description: "Custom priority stored in workflow variables.",
  },
] as const;

export const WORKFLOW_COLLECTION_PATH_OPTIONS = [
  {
    value: "payload.items",
    label: "Payload items",
    description: "Array of items provided by the triggering payload.",
  },
  {
    value: "payload.contacts",
    label: "Payload contacts",
    description: "Contact records included with the trigger payload.",
  },
  {
    value: "previousStep.data",
    label: "Previous step data",
    description: "Array returned from the immediately preceding node.",
  },
  {
    value: "results.query.records",
    label: "Query results records",
    description: "Records produced by a linked query node.",
  },
  {
    value: "workflow.variables.list",
    label: "Workflow variable list",
    description: "List stored in workflow-level variables.",
  },
] as const;
