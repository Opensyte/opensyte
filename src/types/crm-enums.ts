// CRM Enum types that match our Prisma schema

export enum CustomerType {
  LEAD = "Lead",
  PROSPECT = "Prospect",
  CUSTOMER = "Customer",
  FORMER = "Former",
}

export enum LeadStatus {
  NEW = "New",
  CONTACTED = "Contacted",
  QUALIFIED = "Qualified",
  PROPOSAL = "Proposal",
  NEGOTIATION = "Negotiation",
  CLOSED_WON = "Closed Won",
  CLOSED_LOST = "Closed Lost",
}

export enum LeadSource {
  WEBSITE = "Website",
  REFERRAL = "Referral",
  SOCIAL_MEDIA = "Social Media",
  EMAIL_CAMPAIGN = "Email Campaign",
  EVENT = "Event",
  COLD_CALL = "Cold Call",
  OTHER = "Other",
}

export enum InteractionType {
  CALL = "Call",
  EMAIL = "Email",
  MEETING = "Meeting",
  NOTE = "Note",
  TASK = "Task",
}

export enum InteractionMedium {
  IN_PERSON = "In Person",
  PHONE = "Phone",
  VIDEO = "Video",
  EMAIL = "Email",
  CHAT = "Chat",
  OTHER = "Other",
}
