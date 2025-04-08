import * as z from "zod"
import * as imports from "../prisma/null"
import { CustomerType, LeadStatus, LeadSource } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel, CompleteCustomerInteraction, RelatedCustomerInteractionModel, CompleteDeal, RelatedDealModel, CompleteInvoice, RelatedInvoiceModel } from "./index"

export const CustomerModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: z.nativeEnum(CustomerType),
  status: z.nativeEnum(LeadStatus).nullish(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  company: z.string().nullish(),
  position: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  country: z.string().nullish(),
  postalCode: z.string().nullish(),
  source: z.nativeEnum(LeadSource).nullish(),
  notes: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteCustomer extends z.infer<typeof CustomerModel> {
  organization: CompleteOrganization
  interactions: CompleteCustomerInteraction[]
  deals: CompleteDeal[]
  invoices: CompleteInvoice[]
}

/**
 * RelatedCustomerModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCustomerModel: z.ZodSchema<CompleteCustomer> = z.lazy(() => CustomerModel.extend({
  organization: RelatedOrganizationModel,
  interactions: RelatedCustomerInteractionModel.array(),
  deals: RelatedDealModel.array(),
  invoices: RelatedInvoiceModel.array(),
}))
