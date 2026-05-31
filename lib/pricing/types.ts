import type { ProviderName } from "@/lib/providers/types";

export type PricingRule = {
  provider: ProviderName;
  model: string;
  requestType?: "chat" | "embedding" | "rerank";
  pricingVersion: string;
  inputCacheHitUsdMicrosPerMillion: bigint;
  inputCacheMissUsdMicrosPerMillion: bigint;
  inputStandardUsdMicrosPerMillion: bigint;
  outputUsdMicrosPerMillion: bigint;
  billReasoningTokensSeparately: boolean;
  // Long-context tier (>272K tokens for OpenAI GPT-5.x family)
  longContextThresholdTokens?: number;
  inputLongContextStandardUsdMicrosPerMillion?: bigint;
  inputLongContextCacheHitUsdMicrosPerMillion?: bigint;
  inputLongContextCacheMissUsdMicrosPerMillion?: bigint;
  outputLongContextUsdMicrosPerMillion?: bigint;
};
