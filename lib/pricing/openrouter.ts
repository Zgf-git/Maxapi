import type { PricingRule } from "@/lib/pricing/types";

export const OPENROUTER_PRICING_VERSION = "openrouter-operator-usd-2026-05-11";

const OPENROUTER_RULES: Record<string, PricingRule> = {
  "openai/gpt-4o-mini": {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    requestType: "chat",
    pricingVersion: OPENROUTER_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 75_000n,
    inputCacheMissUsdMicrosPerMillion: 150_000n,
    inputStandardUsdMicrosPerMillion: 150_000n,
    outputUsdMicrosPerMillion: 600_000n,
    billReasoningTokensSeparately: false
  },
  "anthropic/claude-sonnet-4.5": {
    provider: "openrouter",
    model: "anthropic/claude-sonnet-4.5",
    requestType: "chat",
    pricingVersion: OPENROUTER_PRICING_VERSION,
    inputCacheHitUsdMicrosPerMillion: 300_000n,
    inputCacheMissUsdMicrosPerMillion: 3_000_000n,
    inputStandardUsdMicrosPerMillion: 3_000_000n,
    outputUsdMicrosPerMillion: 15_000_000n,
    billReasoningTokensSeparately: false
  }
};

export function getOpenRouterPricingRule(model: string) {
  const rule = OPENROUTER_RULES[model];

  if (!rule) {
    throw new Error(`No OpenRouter pricing rule configured for model: ${model}`);
  }

  return rule;
}
