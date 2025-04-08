import * as z from "zod"
import * as imports from "../prisma/null"

export const VerificationModel = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.date(),
  createdAt: z.date().nullish(),
  updatedAt: z.date().nullish(),
})
