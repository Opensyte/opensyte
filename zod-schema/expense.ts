import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { CompleteOrganization, RelatedOrganizationModel } from "./index"

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

export const ExpenseModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  category: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.date(),
  description: z.string().nullish(),
  receipt: z.string().nullish(),
  vendor: z.string().nullish(),
  reimbursable: z.boolean(),
  reimbursed: z.boolean(),
  createdById: z.string().nullish(),
  approvedById: z.string().nullish(),
  approvedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteExpense extends z.infer<typeof ExpenseModel> {
  organization: CompleteOrganization
}

/**
 * RelatedExpenseModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedExpenseModel: z.ZodSchema<CompleteExpense> = z.lazy(() => ExpenseModel.extend({
  organization: RelatedOrganizationModel,
}))
