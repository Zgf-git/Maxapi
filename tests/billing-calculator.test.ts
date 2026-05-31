import { describe, expect, it } from "vitest";

import { calculateUsageCost } from "@/lib/billing/calculator";
import { getOpenAIPricingRule } from "@/lib/pricing/openai";

describe("billing calculator", () => {
  it("uses cache-hit and cache-miss token pricing when available", () => {
    const result = calculateUsageCost(
      {
        promptTokens: 1_000,
        completionTokens: 500,
        totalTokens: 1_500,
        promptCacheHitTokens: 400,
        promptCacheMissTokens: 600,
        reasoningTokens: 100
      },
      getOpenAIPricingRule("gpt-4o-mini")
    );

    expect(result.inputCostUsdMicros).toBe(120n);
    expect(result.outputCostUsdMicros).toBe(300n);
    expect(result.totalCostUsdMicros).toBe(420n);
  });

  it("falls back to prompt token pricing when cache split is unavailable", () => {
    const result = calculateUsageCost(
      {
        promptTokens: 1_000,
        completionTokens: 500,
        totalTokens: 1_500,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      },
      getOpenAIPricingRule("gpt-4o-mini")
    );

    expect(result.inputCostUsdMicros).toBe(150n);
    expect(result.outputCostUsdMicros).toBe(300n);
    expect(result.totalCostUsdMicros).toBe(450n);
  });

  it("applies long-context tier pricing when prompt exceeds threshold", () => {
    // gpt-5.4 short: $2.50/$15  |  long: $5.00/$22.50  |  threshold: 272K
    const result = calculateUsageCost(
      {
        promptTokens: 300_000,
        completionTokens: 1_000,
        totalTokens: 301_000,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      },
      getOpenAIPricingRule("gpt-5.4")
    );

    // input: 300_000 * $5.00 / 1M = 1_500_000 micros
    expect(result.inputCostUsdMicros).toBe(1_500_000n);
    // output: 1_000 * $22.50 / 1M = 22_500 micros
    expect(result.outputCostUsdMicros).toBe(22_500n);
    expect(result.totalCostUsdMicros).toBe(1_522_500n);
  });

  it("applies long-context cache pricing when prompt exceeds threshold", () => {
    // gpt-5.4 short: hit=$0.25 miss=$2.50  |  long: hit=$0.50 miss=$5.00
    const result = calculateUsageCost(
      {
        promptTokens: 300_000,
        completionTokens: 1_000,
        totalTokens: 301_000,
        promptCacheHitTokens: 200_000,
        promptCacheMissTokens: 100_000,
        reasoningTokens: null
      },
      getOpenAIPricingRule("gpt-5.4")
    );

    // cache hit: 200_000 * $0.50 / 1M = 100_000 micros
    expect(result.inputCostUsdMicros).toBe(100_000n + 500_000n);
    // output: 1_000 * $22.50 / 1M = 22_500 micros
    expect(result.outputCostUsdMicros).toBe(22_500n);
  });

  it("uses short-context pricing when prompt is at or below threshold", () => {
    // gpt-5.4 at exactly 272K tokens should still use short-context pricing
    const result = calculateUsageCost(
      {
        promptTokens: 272_000,
        completionTokens: 1_000,
        totalTokens: 273_000,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      },
      getOpenAIPricingRule("gpt-5.4")
    );

    // input: 272_000 * $2.50 / 1M = 680_000 micros
    expect(result.inputCostUsdMicros).toBe(680_000n);
    // output: 1_000 * $15.00 / 1M = 15_000 micros
    expect(result.outputCostUsdMicros).toBe(15_000n);
  });

  it("uses short-context pricing for models without long-context tier", () => {
    // gpt-5.4-mini has no long-context tier
    const result = calculateUsageCost(
      {
        promptTokens: 300_000,
        completionTokens: 1_000,
        totalTokens: 301_000,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      },
      getOpenAIPricingRule("gpt-5.4-mini")
    );

    // input: 300_000 * $0.75 / 1M = 225_000 micros
    expect(result.inputCostUsdMicros).toBe(225_000n);
    // output: 1_000 * $4.50 / 1M = 4_500 micros
    expect(result.outputCostUsdMicros).toBe(4_500n);
  });
});
