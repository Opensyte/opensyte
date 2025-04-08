import * as z from "zod"
import * as imports from "../prisma/null"
import { CompleteMarketingCampaign, RelatedMarketingCampaignModel } from "./index"

export const EmailCampaignModel = z.object({
  id: z.string(),
  campaignId: z.string(),
  subject: z.string(),
  content: z.string(),
  sender: z.string(),
  scheduledAt: z.date().nullish(),
  sentAt: z.date().nullish(),
  opens: z.number().int(),
  clicks: z.number().int(),
  bounces: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteEmailCampaign extends z.infer<typeof EmailCampaignModel> {
  campaign: CompleteMarketingCampaign
}

/**
 * RelatedEmailCampaignModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedEmailCampaignModel: z.ZodSchema<CompleteEmailCampaign> = z.lazy(() => EmailCampaignModel.extend({
  campaign: RelatedMarketingCampaignModel,
}))
