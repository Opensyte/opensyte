import * as z from "zod"
import * as imports from "../prisma/null"
import { InteractionType, InteractionMedium } from "@prisma/client"
import { CompleteCustomer, RelatedCustomerModel, CompleteTask, RelatedTaskModel } from "./index"

export const CustomerInteractionModel = z.object({
  id: z.string(),
  customerId: z.string(),
  type: z.nativeEnum(InteractionType),
  medium: z.nativeEnum(InteractionMedium),
  subject: z.string().nullish(),
  content: z.string().nullish(),
  scheduledAt: z.date().nullish(),
  completedAt: z.date().nullish(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteCustomerInteraction extends z.infer<typeof CustomerInteractionModel> {
  customer: CompleteCustomer
  tasks: CompleteTask[]
}

/**
 * RelatedCustomerInteractionModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCustomerInteractionModel: z.ZodSchema<CompleteCustomerInteraction> = z.lazy(() => CustomerInteractionModel.extend({
  customer: RelatedCustomerModel,
  tasks: RelatedTaskModel.array(),
}))
