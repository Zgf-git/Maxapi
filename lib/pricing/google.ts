import type { PricingRule } from "@/lib/pricing/types";

export const GOOGLE_PRICING_VERSION = "google-operator-usd-2026-05-11";

const GOOGLE_RULES: Record<string, PricingRule> = {
  "gemini-2.5-flash": {
    provider: "google",
    model: "gemini-2.5-flash",
    requestType: "chat",
    pricingVersion: GOOGLE_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 75_000n,
    inputCacheMissUsdMicrosPerMillion: 300_000n,
    inputStandardUsdMicrosPerMillion: 300_000n,
    outputUsdMicrosPerMillion: 2_500_000n,
    billReasoningTokensSeparately: false
  },
  "gemini-2.5-pro": {
    provider: "google",
    model: "gemini-2.5-pro",
    requestType: "chat",
    pricingVersion: GOOGLE_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 310_000n,
    inputCacheMissUsdMicrosPerMillion: 1_250_000n,
    inputStandardUsdMicrosPerMillion: 1_250_000n,
    outputUsdMicrosPerMillion: 10_000_000n,
    billReasoningTokensSeparately: false
  },
  "text-embedding-004": {
    provider: "google",
    model: "text-embedding-004",
    requestType: "embedding",
    pricingVersion: GOOGLE_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 20_000n,
    inputCacheMissUsdMicrosPerMillion: 20_000n,
    inputStandardUsdMicrosPerMillion: 20_000n,
    outputUsdMicrosPerMillion: 0n,
    billReasoningTokensSeparately: false
  }
};

export function getGooglePricingRule(model: string) {
  const rule = GOOGLE_RULES[model];

  if (!rule) {
    throw new Error(`No Google pricing rule configured for model: ${model}`);
  }

  return rule;
}
