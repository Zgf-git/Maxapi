import type { PricingRule } from "@/lib/pricing/types";

export function formatPricePerMillion(usdMicros: bigint): string {
  const dollars = Number(usdMicros) / 1_000_000;
  return `$${dollars.toFixed(dollars < 1 ? 2 : 2)}`;
}

export function formatPricingForDisplay(rule: PricingRule) {
  const hasLongContext = rule.longContextThresholdTokens !== undefined;

  return {
    input: formatPricePerMillion(rule.inputStandardUsdMicrosPerMillion),
    output: formatPricePerMillion(rule.outputUsdMicrosPerMillion),
    cacheHit: formatPricePerMillion(rule.inputCacheHitUsdMicrosPerMillion),
    cacheMiss: formatPricePerMillion(rule.inputCacheMissUsdMicrosPerMillion),
    version: rule.pricingVersion,
    longContext: hasLongContext
      ? {
          thresholdTokens: rule.longContextThresholdTokens,
          input: formatPricePerMillion(
            rule.inputLongContextStandardUsdMicrosPerMillion ?? rule.inputStandardUsdMicrosPerMillion
          ),
          output: formatPricePerMillion(
            rule.outputLongContextUsdMicrosPerMillion ?? rule.outputUsdMicrosPerMillion
          ),
          cacheHit: formatPricePerMillion(
            rule.inputLongContextCacheHitUsdMicrosPerMillion ?? rule.inputCacheHitUsdMicrosPerMillion
          ),
          cacheMiss: formatPricePerMillion(
            rule.inputLongContextCacheMissUsdMicrosPerMillion ?? rule.inputCacheMissUsdMicrosPerMillion
          )
        }
      : null
  };
}
