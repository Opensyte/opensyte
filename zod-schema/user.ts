import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteSession, RelatedSessionModel, CompleteAccount, RelatedAccountModel } from "./index"

export const UserModel = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteUser extends z.infer<typeof UserModel> {
  sessions: CompleteSession[]
  accounts: CompleteAccount[]
}

/**
 * RelatedUserModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUserModel: z.ZodSchema<CompleteUser> = z.lazy(() => UserModel.extend({
  sessions: RelatedSessionModel.array(),
  accounts: RelatedAccountModel.array(),
}))
