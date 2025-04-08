import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { LeadStatus } from "@prisma/client"
import { CompleteCustomer, RelatedCustomerModel } from "./index"

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

export const DealModel = z.object({
  id: z.string(),
  customerId: z.string(),
  title: z.string(),
  value: z.number(),
  currency: z.string(),
  status: z.nativeEnum(LeadStatus),
  stage: z.number().int(),
  probability: z.number().nullish(),
  expectedCloseDate: z.date().nullish(),
  actualCloseDate: z.date().nullish(),
  description: z.string().nullish(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteDeal extends z.infer<typeof DealModel> {
  customer: CompleteCustomer
}

/**
 * RelatedDealModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDealModel: z.ZodSchema<CompleteDeal> = z.lazy(() => DealModel.extend({
  customer: RelatedCustomerModel,
}))
