import type { PricingRule } from "@/lib/pricing/types";

export const DEEPSEEK_PRICING_VERSION = "deepseek-operator-usd-2026-05-11";

const DEEPSEEK_RULES: Record<string, PricingRule> = {
  "deepseek-chat": {
    provider: "deepseek",
    model: "deepseek-chat",
    requestType: "chat",
    pricingVersion: DEEPSEEK_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 70_000n,
    inputCacheMissUsdMicrosPerMillion: 270_000n,
    inputStandardUsdMicrosPerMillion: 270_000n,
    outputUsdMicrosPerMillion: 1_100_000n,
    billReasoningTokensSeparately: false
  },
  "deepseek-reasoner": {
    provider: "deepseek",
    model: "deepseek-reasoner",
    requestType: "chat",
    pricingVersion: DEEPSEEK_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 140_000n,
    inputCacheMissUsdMicrosPerMillion: 550_000n,
    inputStandardUsdMicrosPerMillion: 550_000n,
    outputUsdMicrosPerMillion: 2_190_000n,
    billReasoningTokensSeparately: false
  }
};

export function getDeepSeekPricingRule(model: string) {
  const rule = DEEPSEEK_RULES[model];

  if (!rule) {
    throw new Error(`No DeepSeek pricing rule configured for model: ${model}`);
  }

  return rule;
}
