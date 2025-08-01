// Main types export file
export * from "./crm";
export * from "./projects";

// Explicitly re-export enum types to resolve conflicts
export {
  CustomerType,
  LeadStatus,
  LeadSource,
  InteractionType as CRMInteractionType,
  InteractionMedium as CRMInteractionMedium,
} from "./crm-enums";
