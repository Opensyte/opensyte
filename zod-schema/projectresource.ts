import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { CompleteProject, RelatedProjectModel } from "./index"

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

export const ProjectResourceModel = z.object({
  projectId: z.string(),
  assigneeId: z.string(),
  role: z.string().nullish(),
  allocation: z.number().nullish(),
  startDate: z.date().nullish(),
  endDate: z.date().nullish(),
  hourlyRate: z.number().nullish(),
  currency: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteProjectResource extends z.infer<typeof ProjectResourceModel> {
  project: CompleteProject
}

/**
 * RelatedProjectResourceModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedProjectResourceModel: z.ZodSchema<CompleteProjectResource> = z.lazy(() => ProjectResourceModel.extend({
  project: RelatedProjectModel,
}))
