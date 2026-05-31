import type { CalculatedUsageCost, ProviderUsageSnapshot } from "@/lib/billing/types";
import type { PricingRule } from "@/lib/pricing/types";

const ONE_MILLION = 1_000_000n;

function roundMicros(tokens: number, priceUsdMicrosPerMillion: bigint) {
  return (BigInt(tokens) * priceUsdMicrosPerMillion + ONE_MILLION / 2n) / ONE_MILLION;
}

export function calculateUsageCost(
  usage: ProviderUsageSnapshot,
  pricingRule: PricingRule
): CalculatedUsageCost {
  const isLongContext =
    pricingRule.longContextThresholdTokens !== undefined &&
    (usage.promptTokens ?? 0) > pricingRule.longContextThresholdTokens;

  const inputStandardPrice = isLongContext
    ? (pricingRule.inputLongContextStandardUsdMicrosPerMillion ?? pricingRule.inputStandardUsdMicrosPerMillion)
    : pricingRule.inputStandardUsdMicrosPerMillion;

  const inputCacheHitPrice = isLongContext
    ? (pricingRule.inputLongContextCacheHitUsdMicrosPerMillion ?? pricingRule.inputCacheHitUsdMicrosPerMillion)
    : pricingRule.inputCacheHitUsdMicrosPerMillion;

  const inputCacheMissPrice = isLongContext
    ? (pricingRule.inputLongContextCacheMissUsdMicrosPerMillion ?? pricingRule.inputCacheMissUsdMicrosPerMillion)
    : pricingRule.inputCacheMissUsdMicrosPerMillion;

  const outputPrice = isLongContext
    ? (pricingRule.outputLongContextUsdMicrosPerMillion ?? pricingRule.outputUsdMicrosPerMillion)
    : pricingRule.outputUsdMicrosPerMillion;

  const promptCacheHitTokens = usage.promptCacheHitTokens ?? 0;
  const promptCacheMissTokens = usage.promptCacheMissTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;

  const hasCacheBreakdown =
    usage.promptCacheHitTokens !== null || usage.promptCacheMissTokens !== null;

  const inputCostUsdMicros = hasCacheBreakdown
    ? roundMicros(promptCacheHitTokens, inputCacheHitPrice) +
      roundMicros(promptCacheMissTokens, inputCacheMissPrice)
    : roundMicros(usage.promptTokens ?? 0, inputStandardPrice);

  const outputCostUsdMicros = roundMicros(completionTokens, outputPrice);

  return {
    inputCostUsdMicros,
    outputCostUsdMicros,
    totalCostUsdMicros: inputCostUsdMicros + outputCostUsdMicros,
    usage
  };
}
