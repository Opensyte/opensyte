import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { PayrollStatus } from "@prisma/client"
import { CompleteEmployee, RelatedEmployeeModel } from "./index"

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

export const PayrollModel = z.object({
  id: z.string(),
  employeeId: z.string(),
  payPeriodStart: z.date(),
  payPeriodEnd: z.date(),
  payDate: z.date(),
  basicSalary: z.number(),
  overtime: z.number(),
  bonus: z.number(),
  tax: z.number(),
  deductions: z.number(),
  netAmount: z.number(),
  currency: z.string(),
  status: z.nativeEnum(PayrollStatus),
  notes: z.string().nullish(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompletePayroll extends z.infer<typeof PayrollModel> {
  employee: CompleteEmployee
}

/**
 * RelatedPayrollModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPayrollModel: z.ZodSchema<CompletePayroll> = z.lazy(() => PayrollModel.extend({
  employee: RelatedEmployeeModel,
}))
