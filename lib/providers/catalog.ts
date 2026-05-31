import { env } from "@/lib/env";
import type { ProviderName } from "@/lib/providers/types";

export type ProviderDefinition = {
  slug: ProviderName;
  label: string;
  baseUrl: string;
  testModel: string;
  supportsChat: boolean;
  supportsEmbeddings: boolean;
  supportsRerank: boolean;
};

export const PROVIDER_DEFINITIONS: Record<ProviderName, ProviderDefinition> = {
  openai: {
    slug: "openai",
    label: "OpenAI",
    baseUrl: env.OPENAI_BASE_URL,
    testModel: "gpt-4o-mini",
    supportsChat: true,
    supportsEmbeddings: true,
    supportsRerank: false
  },
  apimart: {
    slug: "apimart",
    label: "APIMart",
    baseUrl: env.APIMART_BASE_URL,
    testModel: "deepseek-v3.1",
    supportsChat: true,
    supportsEmbeddings: false,
    supportsRerank: true
  },
  openrouter: {
    slug: "openrouter",
    label: "OpenRouter",
    baseUrl: env.OPENROUTER_BASE_URL,
    testModel: "openai/gpt-4o-mini",
    supportsChat: true,
    supportsEmbeddings: false,
    supportsRerank: false
  },
  deepseek: {
    slug: "deepseek",
    label: "DeepSeek",
    baseUrl: env.DEEPSEEK_BASE_URL,
    testModel: "deepseek-chat",
    supportsChat: true,
    supportsEmbeddings: false,
    supportsRerank: false
  },
  google: {
    slug: "google",
    label: "Google Gemini",
    baseUrl: env.GOOGLE_BASE_URL,
    testModel: "gemini-2.5-flash",
    supportsChat: true,
    supportsEmbeddings: true,
    supportsRerank: false
  }
};

export function getProviderDefinition(provider: ProviderName) {
  return PROVIDER_DEFINITIONS[provider];
}

export function listProviderDefinitions() {
  return Object.values(PROVIDER_DEFINITIONS);
}
