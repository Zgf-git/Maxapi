const DEFAULT_COST_BASIS_BPS = 8_500n;

const PROVIDER_COST_BASIS_BPS: Record<string, bigint> = {
  openai: 9_000n,
  apimart: 8_200n,
  openrouter: 9_300n,
  deepseek: 8_000n,
  google: 8_800n
};

export function getProviderCostBasisBps(provider: string) {
  return PROVIDER_COST_BASIS_BPS[provider] ?? DEFAULT_COST_BASIS_BPS;
}

export function estimateProviderCostUsdMicros(provider: string, sellPriceUsdMicros: bigint) {
  return (sellPriceUsdMicros * getProviderCostBasisBps(provider)) / 10_000n;
}
