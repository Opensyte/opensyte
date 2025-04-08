import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { ProjectStatus } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel, CompleteTask, RelatedTaskModel, CompleteProjectResource, RelatedProjectResourceModel, CompleteTimeEntry, RelatedTimeEntryModel } from "./index"

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

export const ProjectModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  startDate: z.date().nullish(),
  endDate: z.date().nullish(),
  status: z.nativeEnum(ProjectStatus),
  budget: z.number().nullish(),
  currency: z.string(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteProject extends z.infer<typeof ProjectModel> {
  organization: CompleteOrganization
  tasks: CompleteTask[]
  resources: CompleteProjectResource[]
  timeEntries: CompleteTimeEntry[]
}

/**
 * RelatedProjectModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedProjectModel: z.ZodSchema<CompleteProject> = z.lazy(() => ProjectModel.extend({
  organization: RelatedOrganizationModel,
  tasks: RelatedTaskModel.array(),
  resources: RelatedProjectResourceModel.array(),
  timeEntries: RelatedTimeEntryModel.array(),
}))
