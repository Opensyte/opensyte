import * as z from "zod"
import * as imports from "../prisma/null"
import { NotificationType } from "@prisma/client"

export const NotificationModel = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.nativeEnum(NotificationType),
  read: z.boolean(),
  actionUrl: z.string().nullish(),
  createdAt: z.date(),
})
