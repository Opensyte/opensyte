import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { PaymentMethod } from "@prisma/client"
import { CompleteInvoice, RelatedInvoiceModel } from "./index"

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

export const PaymentModel = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amount: z.number(),
  currency: z.string(),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().nullish(),
  paymentDate: z.date(),
  notes: z.string().nullish(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompletePayment extends z.infer<typeof PaymentModel> {
  invoice: CompleteInvoice
}

/**
 * RelatedPaymentModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPaymentModel: z.ZodSchema<CompletePayment> = z.lazy(() => PaymentModel.extend({
  invoice: RelatedInvoiceModel,
}))
