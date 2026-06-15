// CRM Enum types that match our Prisma schema

export enum CustomerType {
  LEAD = "LEAD",
  PROSPECT = "PROSPECT",
  CUSTOMER = "CUSTOMER",
  FORMER = "FORMER",
}

export enum LeadStatus {
  IDENTIFIED = "IDENTIFIED",
  CONNECTION_SENT = "CONNECTION_SENT",
  CONNECTED = "CONNECTED",
  MESSAGED = "MESSAGED",
  IN_CONVERSATION = "IN_CONVERSATION",
  CALL_BOOKED = "CALL_BOOKED",
  PROPOSAL_SENT = "PROPOSAL_SENT",
  WON = "WON",
  LOST = "LOST",
}

export enum LeadSource {
  WEBSITE = "WEBSITE",
  REFERRAL = "REFERRAL",
  SOCIAL_MEDIA = "SOCIAL_MEDIA",
  EMAIL_CAMPAIGN = "EMAIL_CAMPAIGN",
  EVENT = "EVENT",
  COLD_CALL = "COLD_CALL",
  OTHER = "OTHER",
}

export enum InteractionType {
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
  NOTE = "NOTE",
  TASK = "TASK",
}

export enum InteractionMedium {
  IN_PERSON = "IN_PERSON",
  PHONE = "PHONE",
  VIDEO = "VIDEO",
  EMAIL = "EMAIL",
  CHAT = "CHAT",
  OTHER = "OTHER",
}
