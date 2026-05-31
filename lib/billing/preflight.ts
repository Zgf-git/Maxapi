import { getOrCreateUserBalance } from "@/lib/balance/service";
import { calculateUsageCost } from "@/lib/billing/calculator";
import type { ProviderUsageSnapshot } from "@/lib/billing/types";
import { ApiRouteError } from "@/lib/chat/errors";
import { env } from "@/lib/env";
import { getPricingRule } from "@/lib/pricing";
import type { ChatCompletionRequestInput, EmbeddingRequestInput, ProviderName, RerankRequestInput } from "@/lib/providers/types";
import { getProviderForModel } from "@/lib/routing/config";
import { getRuntimeTargetsForRoutePolicy } from "@/lib/routing/runtime";

const CHARS_PER_TOKEN_ESTIMATE = 4;

type CostTarget = {
  provider: ProviderName;
  model: string;
};

function estimateTextTokens(value: unknown): number {
  if (typeof value === "string") {
    return Math.ceil(value.length / CHARS_PER_TOKEN_ESTIMATE);
  }

  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + estimateTextTokens(item), 0);
  }

  if (value && typeof value === "object") {
    return estimateTextTokens(Object.values(value));
  }

  return 0;
}

function estimateChatPromptTokens(input: ChatCompletionRequestInput) {
  return Math.max(1, estimateTextTokens(input.messages));
}

function estimateEmbeddingPromptTokens(input: EmbeddingRequestInput) {
  return Math.max(1, estimateTextTokens(input.input));
}

function estimateRerankPromptTokens(input: RerankRequestInput) {
  return Math.max(1, estimateTextTokens(input.query) + estimateTextTokens(input.documents));
}

function estimateChatUsage(input: ChatCompletionRequestInput): ProviderUsageSnapshot {
  const promptTokens = estimateChatPromptTokens(input);
  const completionTokens = input.max_tokens ?? env.PREFLIGHT_DEFAULT_MAX_OUTPUT_TOKENS;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    promptCacheHitTokens: null,
    promptCacheMissTokens: null,
    reasoningTokens: null
  };
}

function estimateEmbeddingUsage(input: EmbeddingRequestInput): ProviderUsageSnapshot {
  const promptTokens = estimateEmbeddingPromptTokens(input);

  return {
    promptTokens,
    completionTokens: 0,
    totalTokens: promptTokens,
    promptCacheHitTokens: null,
    promptCacheMissTokens: null,
    reasoningTokens: null
  };
}

function estimateRerankUsage(input: RerankRequestInput): ProviderUsageSnapshot {
  const promptTokens = estimateRerankPromptTokens(input);

  return {
    promptTokens,
    completionTokens: 0,
    totalTokens: promptTokens,
    promptCacheHitTokens: null,
    promptCacheMissTokens: null,
    reasoningTokens: null
  };
}

async function resolveChatCostTargets(input: ChatCompletionRequestInput): Promise<CostTarget[]> {
  if (input.route_policy) {
    return getRuntimeTargetsForRoutePolicy(input.route_policy);
  }

  if (!input.model) {
    throw new ApiRouteError(400, "invalid_request", "Either model or route_policy must be provided.");
  }

  const provider = getProviderForModel(input.model);

  if (!provider) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${input.model}.`, "unsupported_model");
  }

  return [{ provider, model: input.model }];
}

async function assertEstimatedCostAllowed(input: {
  userId: string;
  targets: CostTarget[];
  usage: ProviderUsageSnapshot;
}) {
  const estimates = input.targets.map((target) => {
    const pricingRule = getPricingRule(target.provider, target.model);
    const cost = calculateUsageCost(input.usage, pricingRule);

    return {
      ...target,
      totalCostUsdMicros: cost.totalCostUsdMicros
    };
  });
  const highestEstimate = estimates.reduce((highest, current) =>
    current.totalCostUsdMicros > highest.totalCostUsdMicros ? current : highest
  );

  if (highestEstimate.totalCostUsdMicros > env.MAX_REQUEST_COST_USD_MICROS) {
    throw new ApiRouteError(
      402,
      "estimated_request_too_expensive",
      "Estimated request cost exceeds the maximum allowed per-request cost."
    );
  }

  const balance = await getOrCreateUserBalance(input.userId);

  if (balance.balanceUsdMicros < highestEstimate.totalCostUsdMicros) {
    throw new ApiRouteError(
      402,
      "insufficient_estimated_balance",
      "Insufficient balance for the estimated request cost."
    );
  }

  return highestEstimate;
}

export async function assertEstimatedChatRequestBudget(
  userId: string,
  input: ChatCompletionRequestInput
) {
  return assertEstimatedCostAllowed({
    userId,
    targets: await resolveChatCostTargets(input),
    usage: estimateChatUsage(input)
  });
}

export async function assertEstimatedEmbeddingRequestBudget(
  userId: string,
  input: EmbeddingRequestInput
) {
  const provider = getProviderForModel(input.model);

  if (!provider) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${input.model}.`, "unsupported_model");
  }

  return assertEstimatedCostAllowed({
    userId,
    targets: [{ provider, model: input.model }],
    usage: estimateEmbeddingUsage(input)
  });
}

export async function assertEstimatedRerankRequestBudget(
  userId: string,
  input: RerankRequestInput
) {
  const provider = getProviderForModel(input.model);

  if (!provider) {
    throw new ApiRouteError(400, "unsupported_model", `Unsupported model: ${input.model}.`, "unsupported_model");
  }

  return assertEstimatedCostAllowed({
    userId,
    targets: [{ provider, model: input.model }],
    usage: estimateRerankUsage(input)
  });
}
