// Main types export file
export * from "./crm";
export * from "./projects";
export * from "./hr";

// Explicitly re-export enum types to resolve conflicts
export {
  CustomerType,
  LeadStatus,
  LeadSource,
  InteractionType as CRMInteractionType,
  InteractionMedium as CRMInteractionMedium,
} from "./crm-enums";

// Re-export currencies and CurrencyCode from prisma folder for global use
export { currencies, type CurrencyCode } from "./currencies";
