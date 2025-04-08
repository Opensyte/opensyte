import * as z from "zod"
import * as imports from "../prisma/null"
import { AttendeeStatus } from "@prisma/client"
import { CompleteCalendarEvent, RelatedCalendarEventModel } from "./index"

export const CalendarEventAttendeeModel = z.object({
  eventId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(AttendeeStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteCalendarEventAttendee extends z.infer<typeof CalendarEventAttendeeModel> {
  event: CompleteCalendarEvent
}

/**
 * RelatedCalendarEventAttendeeModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCalendarEventAttendeeModel: z.ZodSchema<CompleteCalendarEventAttendee> = z.lazy(() => CalendarEventAttendeeModel.extend({
  event: RelatedCalendarEventModel,
}))
