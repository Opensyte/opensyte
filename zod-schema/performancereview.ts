import * as z from "zod"
import * as imports from "../prisma/null"
import { ReviewStatus } from "@prisma/client"
import { CompleteEmployee, RelatedEmployeeModel } from "./index"

export const PerformanceReviewModel = z.object({
  id: z.string(),
  employeeId: z.string(),
  reviewerId: z.string(),
  reviewPeriod: z.string(),
  performanceScore: z.number().nullish(),
  strengths: z.string().nullish(),
  improvements: z.string().nullish(),
  goals: z.string().nullish(),
  comments: z.string().nullish(),
  reviewDate: z.date(),
  status: z.nativeEnum(ReviewStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompletePerformanceReview extends z.infer<typeof PerformanceReviewModel> {
  employee: CompleteEmployee
}

/**
 * RelatedPerformanceReviewModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPerformanceReviewModel: z.ZodSchema<CompletePerformanceReview> = z.lazy(() => PerformanceReviewModel.extend({
  employee: RelatedEmployeeModel,
}))
