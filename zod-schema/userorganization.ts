import * as z from "zod"
import * as imports from "../prisma/null"
import { UserRole } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel } from "./index"

export const UserOrganizationModel = z.object({
  userId: z.string(),
  organizationId: z.string(),
  role: z.nativeEnum(UserRole),
  joinedAt: z.date(),
})

export interface CompleteUserOrganization extends z.infer<typeof UserOrganizationModel> {
  organization: CompleteOrganization
}

/**
 * RelatedUserOrganizationModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedUserOrganizationModel: z.ZodSchema<CompleteUserOrganization> = z.lazy(() => UserOrganizationModel.extend({
  organization: RelatedOrganizationModel,
}))
