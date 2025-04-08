import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteProject, RelatedProjectModel, CompleteTask, RelatedTaskModel } from "./index"

export const TimeEntryModel = z.object({
  id: z.string(),
  projectId: z.string().nullish(),
  taskId: z.string().nullish(),
  userId: z.string(),
  description: z.string().nullish(),
  startTime: z.date(),
  endTime: z.date().nullish(),
  duration: z.number().int().nullish(),
  billable: z.boolean(),
  invoiced: z.boolean(),
  invoiceId: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteTimeEntry extends z.infer<typeof TimeEntryModel> {
  project?: CompleteProject | null
  task?: CompleteTask | null
}

/**
 * RelatedTimeEntryModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTimeEntryModel: z.ZodSchema<CompleteTimeEntry> = z.lazy(() => TimeEntryModel.extend({
  project: RelatedProjectModel.nullish(),
  task: RelatedTaskModel.nullish(),
}))
