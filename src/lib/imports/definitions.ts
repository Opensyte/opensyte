import { CustomerType, LeadSource, LeadStatus } from "@prisma/client";
import type { Customer } from "@prisma/client";

export const CRM_CONTACT_FIELDS = [
  {
    key: "firstName",
    label: "First Name",
    description: "Given name of the contact",
    required: true,
  },
  {
    key: "lastName",
    label: "Last Name",
    description: "Family name of the contact",
    required: true,
  },
  {
    key: "email",
    label: "Email",
    description: "Primary email address",
    required: false,
  },
  {
    key: "phone",
    label: "Phone",
    description: "Primary phone number",
    required: false,
  },
  {
    key: "company",
    label: "Company",
    description: "Associated organization or company name",
    required: false,
  },
  {
    key: "position",
    label: "Title",
    description: "Role or job title",
    required: false,
  },
  {
    key: "status",
    label: "Lead Status",
    description: "Pipeline status (e.g. NEW, QUALIFIED)",
    required: false,
  },
  {
    key: "type",
    label: "Contact Type",
    description: "Lead, prospect, or customer designation",
    required: false,
  },
  {
    key: "source",
    label: "Source",
    description: "Acquisition channel",
    required: false,
  },
  {
    key: "address",
    label: "Address",
    description: "Street address",
    required: false,
  },
  {
    key: "city",
    label: "City",
    description: "City name",
    required: false,
  },
  {
    key: "state",
    label: "State / Region",
    description: "State, province, or region",
    required: false,
  },
  {
    key: "country",
    label: "Country",
    description: "Country name",
    required: false,
  },
  {
    key: "postalCode",
    label: "Postal Code",
    description: "Zip or postal code",
    required: false,
  },
  {
    key: "notes",
    label: "Notes",
    description: "Internal notes about the contact",
    required: false,
  },
] as const;

export type CRMContactFieldKey = (typeof CRM_CONTACT_FIELDS)[number]["key"];

export interface CRMContactFieldDefinition {
  key: CRMContactFieldKey;
  label: string;
  description: string;
  required: boolean;
}

export interface ColumnMetadata {
  name: string;
  sampleValues: string[];
}

export const CRM_CONTACT_FIELD_MAP: Record<CRMContactFieldKey, keyof Customer> =
  {
    firstName: "firstName",
    lastName: "lastName",
    email: "email",
    phone: "phone",
    company: "company",
    position: "position",
    status: "status",
    type: "type",
    source: "source",
    address: "address",
    city: "city",
    state: "state",
    country: "country",
    postalCode: "postalCode",
    notes: "notes",
  };

export const CRM_REQUIRED_CONTACT_FIELDS: CRMContactFieldKey[] =
  CRM_CONTACT_FIELDS.filter(field => field.required).map(field => field.key);

export const CRM_OPTIONAL_CONTACT_FIELDS: CRMContactFieldKey[] =
  CRM_CONTACT_FIELDS.filter(field => !field.required).map(field => field.key);

export const DEDUPE_MODES = ["SKIP", "UPDATE", "CREATE"] as const;
export type DedupeModeValue = (typeof DEDUPE_MODES)[number];

export const CRM_SUPPORTED_CONTACT_TYPES: CustomerType[] = [
  CustomerType.LEAD,
  CustomerType.PROSPECT,
  CustomerType.CUSTOMER,
  CustomerType.FORMER,
];

export const CRM_SUPPORTED_LEAD_STATUS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.CLOSED_WON,
  LeadStatus.CLOSED_LOST,
];

export const CRM_SUPPORTED_LEAD_SOURCES: LeadSource[] = [
  LeadSource.WEBSITE,
  LeadSource.REFERRAL,
  LeadSource.SOCIAL_MEDIA,
  LeadSource.EMAIL_CAMPAIGN,
  LeadSource.EVENT,
  LeadSource.COLD_CALL,
  LeadSource.OTHER,
];

export type ImportableValue = string | number | boolean | null;

export type ImportRowRecord = Record<string, ImportableValue>;

export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function isCRMContactField(key: string): key is CRMContactFieldKey {
  return CRM_CONTACT_FIELDS.some(field => field.key === key);
}
