import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteCalendarEventAttendee, RelatedCalendarEventAttendeeModel } from "./index"

export const CalendarEventModel = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  startTime: z.date(),
  endTime: z.date(),
  allDay: z.boolean(),
  location: z.string().nullish(),
  organizerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteCalendarEvent extends z.infer<typeof CalendarEventModel> {
  attendees: CompleteCalendarEventAttendee[]
}

/**
 * RelatedCalendarEventModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCalendarEventModel: z.ZodSchema<CompleteCalendarEvent> = z.lazy(() => CalendarEventModel.extend({
  attendees: RelatedCalendarEventAttendeeModel.array(),
}))
