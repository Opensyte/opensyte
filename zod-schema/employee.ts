import * as z from "zod"
import * as imports from "../prisma/null"
import { EmployeeStatus } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel, CompletePayroll, RelatedPayrollModel, CompleteTimeOff, RelatedTimeOffModel, CompletePerformanceReview, RelatedPerformanceReviewModel } from "./index"

export const EmployeeModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  position: z.string().nullish(),
  department: z.string().nullish(),
  hireDate: z.date().nullish(),
  terminationDate: z.date().nullish(),
  status: z.nativeEnum(EmployeeStatus),
  managerId: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  country: z.string().nullish(),
  postalCode: z.string().nullish(),
  birthDate: z.date().nullish(),
  taxId: z.string().nullish(),
  emergencyContactName: z.string().nullish(),
  emergencyContactPhone: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteEmployee extends z.infer<typeof EmployeeModel> {
  organization: CompleteOrganization
  payrolls: CompletePayroll[]
  timeOff: CompleteTimeOff[]
  performanceReviews: CompletePerformanceReview[]
}

/**
 * RelatedEmployeeModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedEmployeeModel: z.ZodSchema<CompleteEmployee> = z.lazy(() => EmployeeModel.extend({
  organization: RelatedOrganizationModel,
  payrolls: RelatedPayrollModel.array(),
  timeOff: RelatedTimeOffModel.array(),
  performanceReviews: RelatedPerformanceReviewModel.array(),
}))
