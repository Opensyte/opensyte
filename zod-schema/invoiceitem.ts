import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
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

export const InvoiceItemModel = z.object({
  id: z.string(),
  invoiceId: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  taxRate: z.number(),
  subtotal: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteInvoiceItem extends z.infer<typeof InvoiceItemModel> {
  invoice: CompleteInvoice
}

/**
 * RelatedInvoiceItemModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedInvoiceItemModel: z.ZodSchema<CompleteInvoiceItem> = z.lazy(() => InvoiceItemModel.extend({
  invoice: RelatedInvoiceModel,
}))
