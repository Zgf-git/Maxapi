import { getCatalogExplicitModels, getCatalogPolicyEntry } from "@/lib/catalog";
import type { ProviderName, RoutePolicy } from "@/lib/providers/types";

const EXPLICIT_MODELS = getCatalogExplicitModels();

export const MODEL_PROVIDER_MAP = Object.fromEntries(
  EXPLICIT_MODELS.map(({ upstreamModel, provider }) => [upstreamModel, provider])
) as Record<string, ProviderName>;

export const SUPPORTED_CHAT_MODELS = EXPLICIT_MODELS.filter((entry) => entry.category === "chat").map(
  ({ upstreamModel }) => upstreamModel
);

export const SUPPORTED_EMBEDDING_MODELS = EXPLICIT_MODELS.filter(
  (entry) => entry.category === "embedding"
).map(({ upstreamModel }) => upstreamModel);

export const SUPPORTED_RERANK_MODELS = EXPLICIT_MODELS.filter(
  (entry) => entry.category === "rerank"
).map(({ upstreamModel }) => upstreamModel);

export function normalizeRoutePolicy(routePolicy: RoutePolicy): RoutePolicy {
  return routePolicy;
}

export function getStaticTargetsForRoutePolicy(routePolicy: RoutePolicy) {
  const entry = getCatalogPolicyEntry(normalizeRoutePolicy(routePolicy));

  if (!entry) {
    throw new Error(`Missing catalog entry for route policy: ${routePolicy}`);
  }

  return entry.targets;
}

export function getProviderForModel(model: string): ProviderName | null {
  return MODEL_PROVIDER_MAP[model] ?? null;
}

export function isSupportedChatModel(model: string) {
  return SUPPORTED_CHAT_MODELS.includes(model);
}

export function isSupportedEmbeddingModel(model: string) {
  return SUPPORTED_EMBEDDING_MODELS.includes(model);
}

export function isSupportedRerankModel(model: string) {
  return SUPPORTED_RERANK_MODELS.includes(model);
}
