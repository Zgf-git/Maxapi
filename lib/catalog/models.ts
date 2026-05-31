import { getPricingRule } from "@/lib/pricing";

import type { CatalogExplicitModelEntry, CatalogPolicyEntry } from "@/lib/catalog/types";
import type { RouteTarget } from "@/lib/routing/types";

function getPricingReference(provider: CatalogExplicitModelEntry["provider"], model: string) {
  return getPricingRule(provider, model).pricingVersion;
}

function buildPolicyEntry(
  input: Omit<CatalogPolicyEntry, "defaultProvider" | "defaultModel" | "fallbackProvider" | "fallbackModel"> & {
    targets: RouteTarget[];
  }
): CatalogPolicyEntry {
  const [primary, fallback] = input.targets;

  if (!primary) {
    throw new Error(`Route policy ${input.routePolicy} requires at least one target.`);
  }

  return {
    ...input,
    defaultProvider: primary.provider,
    defaultModel: primary.model,
    fallbackProvider: fallback?.provider ?? null,
    fallbackModel: fallback?.model ?? null
  };
}

const explicitModels: CatalogExplicitModelEntry[] = [
  {
    kind: "model",
    id: "gpt-5.5",
    label: "GPT-5.5",
    description: "OpenAI's latest frontier model with 1M context and agentic capabilities. API rollout in progress.",
    provider: "openai",
    upstreamModel: "gpt-5.5",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: false,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Agentic coding", "Complex reasoning", "Long-context tasks", "Cutting-edge workloads"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-5.5"),
    docsSlug: "gpt-55",
    sortOrder: 10
  },
  {
    kind: "model",
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    description: "Premium variant of GPT-5.5 with deeper reasoning and highest accuracy for mission-critical tasks.",
    provider: "openai",
    upstreamModel: "gpt-5.5-pro",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: false,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Maximum accuracy", "Mission-critical reasoning", "Enterprise analysis"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-5.5-pro"),
    docsSlug: "gpt-55-pro",
    sortOrder: 15
  },
  {
    kind: "model",
    id: "gpt-5.4",
    label: "GPT-5.4",
    description: "OpenAI's current flagship with 1M context, native computer use, and best-in-class reasoning.",
    provider: "openai",
    upstreamModel: "gpt-5.4",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: true,
    status: "active",
    recommendedFor: ["Production chat", "Code generation", "Complex reasoning", "Computer use"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-5.4"),
    docsSlug: "gpt-54",
    sortOrder: 20
  },
  {
    kind: "model",
    id: "gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    description: "Premium variant of GPT-5.4 with deeper reasoning and higher output quality for mission-critical tasks.",
    provider: "openai",
    upstreamModel: "gpt-5.4-pro",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["Enterprise analysis", "Mission-critical reasoning", "Maximum quality"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-5.4-pro"),
    docsSlug: "gpt-54-pro",
    sortOrder: 30
  },
  {
    kind: "model",
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Fast, capable model with 400K context. Great balance of speed, quality, and cost.",
    provider: "openai",
    upstreamModel: "gpt-5.4-mini",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["High-volume chat", "Cost-sensitive workloads", "Fast responses"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-5.4-mini"),
    docsSlug: "gpt-54-mini",
    sortOrder: 40
  },
  {
    kind: "model",
    id: "gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    description: "Ultra-lightweight model for simple tasks and maximum cost savings.",
    provider: "openai",
    upstreamModel: "gpt-5.4-nano",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["Prototyping", "Simple Q&A", "Maximum cost savings"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-5.4-nano"),
    docsSlug: "gpt-54-nano",
    sortOrder: 50
  },
  {
    kind: "model",
    id: "gpt-4o",
    label: "GPT-4o",
    description: "OpenAI multimodal flagship. Best for vision, audio, and complex creative tasks.",
    provider: "openai",
    upstreamModel: "gpt-4o",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["Vision tasks", "Creative writing", "Production chat", "Multimodal"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-4o"),
    docsSlug: "gpt-4o",
    sortOrder: 60
  },
  {
    kind: "model",
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Fast, affordable multimodal model for everyday tasks at the lowest cost.",
    provider: "openai",
    upstreamModel: "gpt-4o-mini",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["High-volume chat", "Cost-sensitive workloads", "Fast responses"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "gpt-4o-mini"),
    docsSlug: "gpt-4o-mini",
    sortOrder: 70
  },
  {
    kind: "model",
    id: "text-embedding-3-small",
    label: "text-embedding-3-small",
    description: "Low-cost OpenAI embedding model for semantic search, retrieval, and classification.",
    provider: "openai",
    upstreamModel: "text-embedding-3-small",
    category: "embedding",
    supportsStreaming: false,
    supportsTools: false,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["Semantic search", "RAG indexing", "Clustering"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "text-embedding-3-small"),
    docsSlug: "text-embedding-3-small",
    sortOrder: 80
  },
  {
    kind: "model",
    id: "text-embedding-3-large",
    label: "text-embedding-3-large",
    description: "Higher-accuracy OpenAI embedding model for production retrieval and ranking workloads.",
    provider: "openai",
    upstreamModel: "text-embedding-3-large",
    category: "embedding",
    supportsStreaming: false,
    supportsTools: false,
    isPublic: true,
    isDefault: false,
    status: "active",
    recommendedFor: ["High-accuracy retrieval", "Knowledge indexing", "Ranking pipelines"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openai", "text-embedding-3-large"),
    docsSlug: "text-embedding-3-large",
    sortOrder: 90
  },
  {
    kind: "model",
    id: "claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    description: "Anthropic-class reasoning model routed through an OpenAI-compatible APIMart upstream.",
    provider: "apimart",
    upstreamModel: "claude-sonnet-4.5",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Long-form analysis", "Reasoning-heavy chat", "Premium assistant workloads"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("apimart", "claude-sonnet-4.5"),
    docsSlug: "claude-sonnet-45",
    sortOrder: 100
  },
  {
    kind: "model",
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast multimodal-oriented chat model exposed through the APIMart OpenAI-compatible upstream.",
    provider: "apimart",
    upstreamModel: "gemini-2.5-flash",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Latency-sensitive chat", "General agent workloads", "Lower-cost premium routing"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("apimart", "gemini-2.5-flash"),
    docsSlug: "gemini-25-flash",
    sortOrder: 110
  },
  {
    kind: "model",
    id: "deepseek-v3.1",
    label: "DeepSeek V3.1",
    description: "Cost-efficient reasoning model exposed through the APIMart OpenAI-compatible upstream.",
    provider: "apimart",
    upstreamModel: "deepseek-v3.1",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Cost-sensitive reasoning", "Developer copilots", "General production traffic"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("apimart", "deepseek-v3.1"),
    docsSlug: "deepseek-v31",
    sortOrder: 120
  },
  {
    kind: "model",
    id: "openrouter-gpt-4o-mini",
    label: "OpenRouter GPT-4o Mini",
    description: "OpenRouter-routed OpenAI-compatible model for broad fallback and marketplace coverage.",
    provider: "openrouter",
    upstreamModel: "openai/gpt-4o-mini",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Marketplace fallback", "Provider redundancy", "OpenAI-compatible clients"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openrouter", "openai/gpt-4o-mini"),
    docsSlug: "openrouter-gpt-4o-mini",
    sortOrder: 130
  },
  {
    kind: "model",
    id: "openrouter-claude-sonnet-45",
    label: "OpenRouter Claude Sonnet 4.5",
    description: "Claude-class reasoning through OpenRouter's OpenAI-compatible endpoint.",
    provider: "openrouter",
    upstreamModel: "anthropic/claude-sonnet-4.5",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Premium reasoning", "Provider redundancy", "Claude-compatible workloads"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("openrouter", "anthropic/claude-sonnet-4.5"),
    docsSlug: "openrouter-claude-sonnet-45",
    sortOrder: 140
  },
  {
    kind: "model",
    id: "deepseek-chat",
    label: "DeepSeek Chat",
    description: "Direct DeepSeek OpenAI-compatible chat model for cost-efficient production traffic.",
    provider: "deepseek",
    upstreamModel: "deepseek-chat",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: false,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Low-cost chat", "Reasoning-light production", "Direct provider redundancy"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("deepseek", "deepseek-chat"),
    docsSlug: "deepseek-chat",
    sortOrder: 150
  },
  {
    kind: "model",
    id: "deepseek-reasoner",
    label: "DeepSeek Reasoner",
    description: "Direct DeepSeek reasoning model exposed through an OpenAI-compatible endpoint.",
    provider: "deepseek",
    upstreamModel: "deepseek-reasoner",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: false,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Cost-sensitive reasoning", "Developer copilots", "Long-form analysis"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("deepseek", "deepseek-reasoner"),
    docsSlug: "deepseek-reasoner",
    sortOrder: 160
  },
  {
    kind: "model",
    id: "google-gemini-2.5-pro",
    label: "Google Gemini 2.5 Pro",
    description: "Direct Gemini Pro OpenAI-compatible model for higher-quality reasoning workloads.",
    provider: "google",
    upstreamModel: "gemini-2.5-pro",
    category: "chat",
    supportsStreaming: true,
    supportsTools: true,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["Premium Gemini workloads", "Long-form analysis", "Provider redundancy"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("google", "gemini-2.5-pro"),
    docsSlug: "google-gemini-25-pro",
    sortOrder: 170
  },
  {
    kind: "model",
    id: "google-text-embedding-004",
    label: "Google text-embedding-004",
    description: "Direct Google embedding model for semantic search and retrieval workloads.",
    provider: "google",
    upstreamModel: "text-embedding-004",
    category: "embedding",
    supportsStreaming: false,
    supportsTools: false,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["RAG indexing", "Semantic search", "Provider redundancy"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("google", "text-embedding-004"),
    docsSlug: "google-text-embedding-004",
    sortOrder: 180
  },
  {
    kind: "model",
    id: "bge-reranker-v2-m3",
    label: "BGE Reranker v2 M3",
    description: "Reranking model for retrieval pipelines exposed through an OpenAI-compatible APIMart upstream.",
    provider: "apimart",
    upstreamModel: "bge-reranker-v2-m3",
    category: "rerank",
    supportsStreaming: false,
    supportsTools: false,
    isPublic: true,
    isDefault: false,
    status: "beta",
    recommendedFor: ["RAG reranking", "Search relevance", "Document ranking"],
    pricingDisplayType: "per_token",
    pricingReference: getPricingReference("apimart", "bge-reranker-v2-m3"),
    docsSlug: "bge-reranker-v2-m3",
    sortOrder: 190
  }
];

const policyEntries: CatalogPolicyEntry[] = [
  buildPolicyEntry({
    kind: "policy",
    id: "cheap",
    label: "Cheap",
    description: "Prioritizes low cost and fast responses for routine production traffic.",
    routePolicy: "cheap",
    targets: [
      { provider: "deepseek", model: "deepseek-chat" },
      { provider: "apimart", model: "deepseek-v3.1" },
      { provider: "openai", model: "gpt-4o-mini" },
      { provider: "openrouter", model: "openai/gpt-4o-mini" }
    ],
    recommendedFor: ["High-volume workloads", "Cost-sensitive traffic", "Fast responses"],
    pricingDisplayType: "policy",
    docsSlug: "cheap",
    sortOrder: 10
  }),
  buildPolicyEntry({
    kind: "policy",
    id: "balanced",
    label: "Balanced",
    description: "Targets the main production model with one lower-cost OpenAI fallback path.",
    routePolicy: "balanced",
    targets: [
      { provider: "openai", model: "gpt-5.4" },
      { provider: "apimart", model: "gemini-2.5-flash" },
      { provider: "google", model: "gemini-2.5-pro" },
      { provider: "openai", model: "gpt-4o" }
    ],
    recommendedFor: ["General production chat", "Default backend routing", "Quality/cost balance"],
    pricingDisplayType: "policy",
    docsSlug: "balanced",
    sortOrder: 20
  }),
  buildPolicyEntry({
    kind: "policy",
    id: "premium",
    label: "Premium",
    description: "Prioritizes higher-quality reasoning and keeps a strong OpenAI fallback target available.",
    routePolicy: "premium",
    targets: [
      { provider: "apimart", model: "claude-sonnet-4.5" },
      { provider: "openrouter", model: "anthropic/claude-sonnet-4.5" },
      { provider: "openai", model: "gpt-5.4-pro" },
      { provider: "openai", model: "gpt-5.4" }
    ],
    recommendedFor: ["Quality-sensitive chat", "Enterprise analysis", "Higher-value requests"],
    pricingDisplayType: "policy",
    docsSlug: "premium",
    sortOrder: 30
  }),
  buildPolicyEntry({
    kind: "policy",
    id: "auto",
    label: "Auto",
    description: "Maps to the balanced route by default and keeps one conservative OpenAI fallback path.",
    routePolicy: "auto",
    targets: [
      { provider: "openai", model: "gpt-5.4" },
      { provider: "deepseek", model: "deepseek-chat" },
      { provider: "apimart", model: "deepseek-v3.1" },
      { provider: "openai", model: "gpt-4o" }
    ],
    recommendedFor: ["Simple onboarding", "Default SDK usage"],
    pricingDisplayType: "policy",
    docsSlug: "auto",
    sortOrder: 40
  })
];

export const modelsCatalog = [...explicitModels, ...policyEntries].sort((a, b) => a.sortOrder - b.sortOrder);

export function getCatalogExplicitModels() {
  return explicitModels.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPublicCatalogModels() {
  return getCatalogExplicitModels().filter((entry) => entry.isPublic);
}

export function isPublicCatalogModel(modelId: string) {
  return getPublicCatalogModels().some((entry) => entry.id === modelId);
}

export function getCatalogPolicyEntries() {
  return policyEntries.slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCatalogPolicyEntry(routePolicy: CatalogPolicyEntry["routePolicy"]) {
  return policyEntries.find((entry) => entry.routePolicy === routePolicy) ?? null;
}

export function getPublicCatalogEntries() {
  return modelsCatalog.filter((entry) => entry.kind === "policy" || entry.isPublic);
}

export function getPublicCatalogEntryBySlug(slug: string) {
  return getPublicCatalogEntries().find((entry) => entry.docsSlug === slug) ?? null;
}

export function getPublicCatalogSlugs() {
  return getPublicCatalogEntries().map((entry) => entry.docsSlug);
}
