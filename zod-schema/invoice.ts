import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { InvoiceStatus } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel, CompleteCustomer, RelatedCustomerModel, CompleteInvoiceItem, RelatedInvoiceItemModel, CompletePayment, RelatedPaymentModel } from "./index"

// Helper schema for Decimal fields
z
  .instanceof(Decimal)
  .or(z.string())
  .or(z.number())
  .refine((value) => {
    try {
      return new Decimal(value)
    } catch (error) {
      return false
    }
  })
  .transform((value) => new Decimal(value))

export const InvoiceModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  customerId: z.string().nullish(),
  invoiceNumber: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  issueDate: z.date(),
  dueDate: z.date(),
  subtotal: z.number(),
  taxAmount: z.number(),
  discountAmount: z.number(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  currency: z.string(),
  notes: z.string().nullish(),
  termsAndConditions: z.string().nullish(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteInvoice extends z.infer<typeof InvoiceModel> {
  organization: CompleteOrganization
  customer?: CompleteCustomer | null
  items: CompleteInvoiceItem[]
  payments: CompletePayment[]
}

/**
 * RelatedInvoiceModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedInvoiceModel: z.ZodSchema<CompleteInvoice> = z.lazy(() => InvoiceModel.extend({
  organization: RelatedOrganizationModel,
  customer: RelatedCustomerModel.nullish(),
  items: RelatedInvoiceItemModel.array(),
  payments: RelatedPaymentModel.array(),
}))
