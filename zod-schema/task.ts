import * as z from "zod"
import * as imports from "../prisma/null"
import { TaskStatus, Priority } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel, CompleteProject, RelatedProjectModel, CompleteTimeEntry, RelatedTimeEntryModel, CompleteComment, RelatedCommentModel, CompleteAttachment, RelatedAttachmentModel, CompleteCustomerInteraction, RelatedCustomerInteractionModel } from "./index"

export const TaskModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  projectId: z.string().nullish(),
  parentTaskId: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(Priority),
  startDate: z.date().nullish(),
  dueDate: z.date().nullish(),
  completedAt: z.date().nullish(),
  assignedToId: z.string().nullish(),
  createdById: z.string().nullish(),
  estimatedHours: z.number().nullish(),
  actualHours: z.number().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  customerInteractionId: z.string().nullish(),
})

export interface CompleteTask extends z.infer<typeof TaskModel> {
  organization: CompleteOrganization
  project?: CompleteProject | null
  parentTask?: CompleteTask | null
  subtasks: CompleteTask[]
  timeEntries: CompleteTimeEntry[]
  comments: CompleteComment[]
  attachments: CompleteAttachment[]
  customerInteraction?: CompleteCustomerInteraction | null
}

/**
 * RelatedTaskModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTaskModel: z.ZodSchema<CompleteTask> = z.lazy(() => TaskModel.extend({
  organization: RelatedOrganizationModel,
  project: RelatedProjectModel.nullish(),
  parentTask: RelatedTaskModel.nullish(),
  subtasks: RelatedTaskModel.array(),
  timeEntries: RelatedTimeEntryModel.array(),
  comments: RelatedCommentModel.array(),
  attachments: RelatedAttachmentModel.array(),
  customerInteraction: RelatedCustomerInteractionModel.nullish(),
}))
