import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteTask, RelatedTaskModel } from "./index"

export const CommentModel = z.object({
  id: z.string(),
  taskId: z.string(),
  content: z.string(),
  authorId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteComment extends z.infer<typeof CommentModel> {
  task: CompleteTask
}

/**
 * RelatedCommentModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCommentModel: z.ZodSchema<CompleteComment> = z.lazy(() => CommentModel.extend({
  task: RelatedTaskModel,
}))
