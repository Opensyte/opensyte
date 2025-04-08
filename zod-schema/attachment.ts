import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteTask, RelatedTaskModel } from "./index"

export const AttachmentModel = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  uploadedById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteAttachment extends z.infer<typeof AttachmentModel> {
  task: CompleteTask
}

/**
 * RelatedAttachmentModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedAttachmentModel: z.ZodSchema<CompleteAttachment> = z.lazy(() => AttachmentModel.extend({
  task: RelatedTaskModel,
}))
