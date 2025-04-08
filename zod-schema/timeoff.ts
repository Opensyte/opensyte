import * as z from "zod"
import * as imports from "../prisma/null"
import { TimeOffType, TimeOffStatus } from "@prisma/client"
import { CompleteEmployee, RelatedEmployeeModel } from "./index"

export const TimeOffModel = z.object({
  id: z.string(),
  employeeId: z.string(),
  type: z.nativeEnum(TimeOffType),
  startDate: z.date(),
  endDate: z.date(),
  duration: z.number(),
  reason: z.string().nullish(),
  status: z.nativeEnum(TimeOffStatus),
  approvedById: z.string().nullish(),
  approvedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteTimeOff extends z.infer<typeof TimeOffModel> {
  employee: CompleteEmployee
}

/**
 * RelatedTimeOffModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTimeOffModel: z.ZodSchema<CompleteTimeOff> = z.lazy(() => TimeOffModel.extend({
  employee: RelatedEmployeeModel,
}))
