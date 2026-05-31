export type ProviderUsageSnapshot = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  promptCacheHitTokens: number | null;
  promptCacheMissTokens: number | null;
  reasoningTokens: number | null;
};

export type CalculatedUsageCost = {
  inputCostUsdMicros: bigint;
  outputCostUsdMicros: bigint;
  totalCostUsdMicros: bigint;
  usage: ProviderUsageSnapshot;
};
