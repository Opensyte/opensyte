import { openai } from "@ai-sdk/openai";
import { env } from "~/env";
// AI Configuration
type OpenAIResponsesModelId =
  | "o1"
  | "o1-2024-12-17"
  | "o3-mini"
  | "o3-mini-2025-01-31"
  | "o3"
  | "o3-2025-04-16"
  | "gpt-5"
  | "gpt-5-2025-08-07"
  | "gpt-5-mini"
  | "gpt-5-mini-2025-08-07"
  | "gpt-5-nano"
  | "gpt-5-nano-2025-08-07"
  | "gpt-5-chat-latest"
  | "gpt-4.1"
  | "gpt-4.1-2025-04-14"
  | "gpt-4.1-mini"
  | "gpt-4.1-mini-2025-04-14"
  | "gpt-4.1-nano"
  | "gpt-4.1-nano-2025-04-14"
  | "gpt-4o"
  | "gpt-4o-2024-05-13"
  | "gpt-4o-2024-08-06"
  | "gpt-4o-2024-11-20"
  | "gpt-4o-mini"
  | "gpt-4o-mini-2024-07-18"
  | "gpt-4-turbo"
  | "gpt-4-turbo-2024-04-09"
  | "gpt-4"
  | "gpt-4-0613"
  | "gpt-3.5-turbo-0125"
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-1106"
  | "chatgpt-4o-latest"
  | (string & {});

export const AI_CONFIG = {
  ENABLED: env.AI_FEATURES_ENABLED === true,
  MODEL: env.AI_MODEL as OpenAIResponsesModelId,
} as const;

// Check if AI features are enabled and properly configured
export function isAIEnabled(): boolean {
  if (!AI_CONFIG.ENABLED) {
    return false;
  }
  return !!env.OPENAI_API_KEY;
}

// Get the configured AI model
export function getAIModel() {
  if (!isAIEnabled()) {
    throw new Error("AI features are not enabled or properly configured");
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const model = AI_CONFIG.MODEL;
  if (!model) {
    throw new Error("AI model is not configured");
  }

  return openai(model);
}

// AI feature flags
export const AI_FEATURES = {
  AUDIT_ENGINE: isAIEnabled(),
  PERSONALIZED_VIEWS: isAIEnabled(),
  DOCUMENT_CLASSIFICATION: isAIEnabled(),
  ANOMALY_DETECTION: isAIEnabled(),
  SMART_INSIGHTS: isAIEnabled(),
} as const;

// Model-specific configurations
export const MODEL_CONFIGS = {
  // Document classification settings
  DOCUMENT_CLASSIFICATION: {
    temperature: 0.1,
    maxTokens: 500,
  },

  // Audit analysis settings
  AUDIT_ANALYSIS: {
    temperature: 0.2,
    maxTokens: 1000,
  },

  // Insight generation settings
  INSIGHT_GENERATION: {
    temperature: 0.3,
    maxTokens: 800,
  },

  // Personalized view settings
  PERSONALIZED_VIEWS: {
    temperature: 0.2,
    maxTokens: 600,
  },
} as const;
