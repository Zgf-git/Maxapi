import type { PricingRule } from "@/lib/pricing/types";

export const APIMART_PRICING_VERSION = "apimart-usd-2026-05-01";

const APIMART_RULES: Record<string, PricingRule> = {
  "claude-sonnet-4.5": {
    provider: "apimart",
    model: "claude-sonnet-4.5",
    requestType: "chat",
    pricingVersion: APIMART_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 0n,
    inputCacheMissUsdMicrosPerMillion: 3_000_000n,
    inputStandardUsdMicrosPerMillion: 3_000_000n,
    outputUsdMicrosPerMillion: 15_000_000n,
    billReasoningTokensSeparately: false
  },
  "gemini-2.5-flash": {
    provider: "apimart",
    model: "gemini-2.5-flash",
    requestType: "chat",
    pricingVersion: APIMART_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 0n,
    inputCacheMissUsdMicrosPerMillion: 300_000n,
    inputStandardUsdMicrosPerMillion: 300_000n,
    outputUsdMicrosPerMillion: 2_500_000n,
    billReasoningTokensSeparately: false
  },
  "deepseek-v3.1": {
    provider: "apimart",
    model: "deepseek-v3.1",
    requestType: "chat",
    pricingVersion: APIMART_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 0n,
    inputCacheMissUsdMicrosPerMillion: 270_000n,
    inputStandardUsdMicrosPerMillion: 270_000n,
    outputUsdMicrosPerMillion: 1_100_000n,
    billReasoningTokensSeparately: false
  },
  "bge-reranker-v2-m3": {
    provider: "apimart",
    model: "bge-reranker-v2-m3",
    requestType: "rerank",
    pricingVersion: APIMART_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 0n,
    inputCacheMissUsdMicrosPerMillion: 100_000n,
    inputStandardUsdMicrosPerMillion: 100_000n,
    outputUsdMicrosPerMillion: 0n,
    billReasoningTokensSeparately: false
  }
};

export function getAPIMartPricingRule(model: string) {
  const rule = APIMART_RULES[model];

  if (!rule) {
    throw new Error(`No APIMart pricing rule configured for model: ${model}`);
  }

  return rule;
}
