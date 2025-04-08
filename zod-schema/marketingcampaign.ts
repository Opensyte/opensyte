import * as z from "zod"
import * as imports from "../prisma/null"
import { Decimal } from "decimal.js"
import { CampaignType, CampaignStatus } from "@prisma/client"
import { CompleteOrganization, RelatedOrganizationModel, CompleteEmailCampaign, RelatedEmailCampaignModel, CompleteSocialMediaPost, RelatedSocialMediaPostModel } from "./index"

// Helper schema for Decimal fields
z
  .instanceof(Decimal)
  .or(z.string())
  .or(z.number())
  .refine((value) => {
    try {
      return new Decimal(value)
    } catch (error) {
      return false
    }
  })
  .transform((value) => new Decimal(value))

export const MarketingCampaignModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  type: z.nativeEnum(CampaignType),
  status: z.nativeEnum(CampaignStatus),
  startDate: z.date().nullish(),
  endDate: z.date().nullish(),
  budget: z.number().nullish(),
  currency: z.string(),
  targetAudience: z.string().nullish(),
  createdById: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export interface CompleteMarketingCampaign extends z.infer<typeof MarketingCampaignModel> {
  organization: CompleteOrganization
  emailCampaigns: CompleteEmailCampaign[]
  socialPosts: CompleteSocialMediaPost[]
}

/**
 * RelatedMarketingCampaignModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedMarketingCampaignModel: z.ZodSchema<CompleteMarketingCampaign> = z.lazy(() => MarketingCampaignModel.extend({
  organization: RelatedOrganizationModel,
  emailCampaigns: RelatedEmailCampaignModel.array(),
  socialPosts: RelatedSocialMediaPostModel.array(),
}))
