import type { PricingRule } from "@/lib/pricing/types";

export const OPENAI_PRICING_VERSION = "openai-usd-2026-04-25";

const OPENAI_LONG_CONTEXT_THRESHOLD = 272_000;

const OPENAI_PRICING_RULES: Record<string, PricingRule> = {
  "gpt-5.5": {
    provider: "openai",
    model: "gpt-5.5",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 500_000n,
    inputCacheMissUsdMicrosPerMillion: 5_000_000n,
    inputStandardUsdMicrosPerMillion: 5_000_000n,
    outputUsdMicrosPerMillion: 30_000_000n,
    billReasoningTokensSeparately: false,
    longContextThresholdTokens: OPENAI_LONG_CONTEXT_THRESHOLD,
    inputLongContextStandardUsdMicrosPerMillion: 10_000_000n,
    inputLongContextCacheHitUsdMicrosPerMillion: 1_000_000n,
    inputLongContextCacheMissUsdMicrosPerMillion: 10_000_000n,
    outputLongContextUsdMicrosPerMillion: 45_000_000n
  },
  "gpt-5.5-pro": {
    provider: "openai",
    model: "gpt-5.5-pro",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 30_000_000n,
    inputCacheMissUsdMicrosPerMillion: 30_000_000n,
    inputStandardUsdMicrosPerMillion: 30_000_000n,
    outputUsdMicrosPerMillion: 180_000_000n,
    billReasoningTokensSeparately: false,
    longContextThresholdTokens: OPENAI_LONG_CONTEXT_THRESHOLD,
    inputLongContextStandardUsdMicrosPerMillion: 60_000_000n,
    inputLongContextCacheHitUsdMicrosPerMillion: 60_000_000n,
    inputLongContextCacheMissUsdMicrosPerMillion: 60_000_000n,
    outputLongContextUsdMicrosPerMillion: 270_000_000n
  },
  "gpt-5.4": {
    provider: "openai",
    model: "gpt-5.4",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 250_000n,
    inputCacheMissUsdMicrosPerMillion: 2_500_000n,
    inputStandardUsdMicrosPerMillion: 2_500_000n,
    outputUsdMicrosPerMillion: 15_000_000n,
    billReasoningTokensSeparately: false,
    longContextThresholdTokens: OPENAI_LONG_CONTEXT_THRESHOLD,
    inputLongContextStandardUsdMicrosPerMillion: 5_000_000n,
    inputLongContextCacheHitUsdMicrosPerMillion: 500_000n,
    inputLongContextCacheMissUsdMicrosPerMillion: 5_000_000n,
    outputLongContextUsdMicrosPerMillion: 22_500_000n
  },
  "gpt-5.4-pro": {
    provider: "openai",
    model: "gpt-5.4-pro",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 30_000_000n,
    inputCacheMissUsdMicrosPerMillion: 30_000_000n,
    inputStandardUsdMicrosPerMillion: 30_000_000n,
    outputUsdMicrosPerMillion: 180_000_000n,
    billReasoningTokensSeparately: false,
    longContextThresholdTokens: OPENAI_LONG_CONTEXT_THRESHOLD,
    inputLongContextStandardUsdMicrosPerMillion: 60_000_000n,
    inputLongContextCacheHitUsdMicrosPerMillion: 60_000_000n,
    inputLongContextCacheMissUsdMicrosPerMillion: 60_000_000n,
    outputLongContextUsdMicrosPerMillion: 270_000_000n
  },
  "gpt-5.4-mini": {
    provider: "openai",
    model: "gpt-5.4-mini",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 75_000n,
    inputCacheMissUsdMicrosPerMillion: 750_000n,
    inputStandardUsdMicrosPerMillion: 750_000n,
    outputUsdMicrosPerMillion: 4_500_000n,
    billReasoningTokensSeparately: false
  },
  "gpt-5.4-nano": {
    provider: "openai",
    model: "gpt-5.4-nano",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 20_000n,
    inputCacheMissUsdMicrosPerMillion: 200_000n,
    inputStandardUsdMicrosPerMillion: 200_000n,
    outputUsdMicrosPerMillion: 1_250_000n,
    billReasoningTokensSeparately: false
  },
  "gpt-4o": {
    provider: "openai",
    model: "gpt-4o",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 1_250_000n,
    inputCacheMissUsdMicrosPerMillion: 2_500_000n,
    inputStandardUsdMicrosPerMillion: 2_500_000n,
    outputUsdMicrosPerMillion: 10_000_000n,
    billReasoningTokensSeparately: false
  },
  "gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    requestType: "chat",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 75_000n,
    inputCacheMissUsdMicrosPerMillion: 150_000n,
    inputStandardUsdMicrosPerMillion: 150_000n,
    outputUsdMicrosPerMillion: 600_000n,
    billReasoningTokensSeparately: false
  },
  "text-embedding-3-small": {
    provider: "openai",
    model: "text-embedding-3-small",
    requestType: "embedding",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 20_000n,
    inputCacheMissUsdMicrosPerMillion: 20_000n,
    inputStandardUsdMicrosPerMillion: 20_000n,
    outputUsdMicrosPerMillion: 0n,
    billReasoningTokensSeparately: false
  },
  "text-embedding-3-large": {
    provider: "openai",
    model: "text-embedding-3-large",
    requestType: "embedding",
    pricingVersion: OPENAI_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 130_000n,
    inputCacheMissUsdMicrosPerMillion: 130_000n,
    inputStandardUsdMicrosPerMillion: 130_000n,
    outputUsdMicrosPerMillion: 0n,
    billReasoningTokensSeparately: false
  }
};

export function getOpenAIPricingRule(model: string) {
  const rule = OPENAI_PRICING_RULES[model];

  if (!rule) {
    throw new Error(`No OpenAI pricing rule configured for model: ${model}`);
  }

  return rule;
}
