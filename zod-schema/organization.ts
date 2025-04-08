import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteUserOrganization, RelatedUserOrganizationModel, CompleteCustomer, RelatedCustomerModel, CompleteProject, RelatedProjectModel, CompleteTask, RelatedTaskModel, CompleteInvoice, RelatedInvoiceModel, CompleteExpense, RelatedExpenseModel, CompleteEmployee, RelatedEmployeeModel, CompleteMarketingCampaign, RelatedMarketingCampaignModel } from "./index"

export const OrganizationModel = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullish(),
  website: z.string().nullish(),
  industry: z.string().nullish(),
  description: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteOrganization extends z.infer<typeof OrganizationModel> {
  users: CompleteUserOrganization[]
  customers: CompleteCustomer[]
  projects: CompleteProject[]
  tasks: CompleteTask[]
  invoices: CompleteInvoice[]
  expenses: CompleteExpense[]
  employees: CompleteEmployee[]
  campaigns: CompleteMarketingCampaign[]
}

/**
 * RelatedOrganizationModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedOrganizationModel: z.ZodSchema<CompleteOrganization> = z.lazy(() => OrganizationModel.extend({
  users: RelatedUserOrganizationModel.array(),
  customers: RelatedCustomerModel.array(),
  projects: RelatedProjectModel.array(),
  tasks: RelatedTaskModel.array(),
  invoices: RelatedInvoiceModel.array(),
  expenses: RelatedExpenseModel.array(),
  employees: RelatedEmployeeModel.array(),
  campaigns: RelatedMarketingCampaignModel.array(),
}))
