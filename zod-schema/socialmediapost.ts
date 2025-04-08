import * as z from "zod"
import * as imports from "../prisma/null"
import { SocialPlatform } from "@prisma/client"
import { CompleteMarketingCampaign, RelatedMarketingCampaignModel } from "./index"

export const SocialMediaPostModel = z.object({
  id: z.string(),
  campaignId: z.string(),
  platform: z.nativeEnum(SocialPlatform),
  content: z.string(),
  mediaUrl: z.string().nullish(),
  scheduledAt: z.date().nullish(),
  publishedAt: z.date().nullish(),
  likes: z.number().int(),
  shares: z.number().int(),
  comments: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteSocialMediaPost extends z.infer<typeof SocialMediaPostModel> {
  campaign: CompleteMarketingCampaign
}

/**
 * RelatedSocialMediaPostModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedSocialMediaPostModel: z.ZodSchema<CompleteSocialMediaPost> = z.lazy(() => SocialMediaPostModel.extend({
  campaign: RelatedMarketingCampaignModel,
}))
