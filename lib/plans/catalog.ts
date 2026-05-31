import { PlanTier } from "@prisma/client";

import type { RoutePolicy } from "@/lib/providers/types";

export type RateLimitProfile = {
  requestMultiplier: number;
  concurrencyMultiplier: number;
};

export type PlanCatalogEntry = {
  id: PlanTier;
  slug: string;
  label: string;
  description: string;
  publicSummary: string;
  allowedRoutePolicies: RoutePolicy[];
  allowedModels: string[];
  rateLimitProfile: RateLimitProfile;
  playgroundAccess: boolean;
  supportLabel: string;
  includedCreditsLabel: string;
  isPublic: boolean;
  sortOrder: number;
};

export const DEFAULT_PLAN = PlanTier.TRIAL;

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    id: PlanTier.TRIAL,
    slug: "trial",
    label: "Trial",
    description: "A safe starting point for first requests and low-volume testing.",
    publicSummary: "Start with basic routing and a narrow model set while usage is still billed from balance.",
    allowedRoutePolicies: ["auto"],
    allowedModels: ["gpt-5.4", "gpt-5.4-mini", "gpt-4o", "gpt-4o-mini", "text-embedding-3-small"],
    rateLimitProfile: {
      requestMultiplier: 0.5,
      concurrencyMultiplier: 0.5
    },
    playgroundAccess: true,
    supportLabel: "Community / best-effort",
    includedCreditsLabel: "Developer credits may be granted manually during onboarding",
    isPublic: true,
    sortOrder: 10
  },
  {
    id: PlanTier.BUILDER,
    slug: "builder",
    label: "Builder",
    description: "For small production integrations that need balanced routing.",
    publicSummary: "Unlock balanced routing and more public text models; usage remains balance-based.",
    allowedRoutePolicies: ["cheap", "balanced", "auto"],
    allowedModels: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-4o", "gpt-4o-mini", "text-embedding-3-small", "text-embedding-3-large", "deepseek-v3.1", "gemini-2.5-flash"],
    rateLimitProfile: {
      requestMultiplier: 1,
      concurrencyMultiplier: 1
    },
    playgroundAccess: true,
    supportLabel: "Standard support",
    includedCreditsLabel: "No automatic recurring credits in this MVP",
    isPublic: true,
    sortOrder: 20
  },
  {
    id: PlanTier.PRO,
    slug: "pro",
    label: "Pro",
    description: "For teams that need premium routing and broader model access.",
    publicSummary: "Unlock premium routing and the full public text model set.",
    allowedRoutePolicies: ["cheap", "balanced", "premium", "auto"],
    allowedModels: ["gpt-5.5", "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-4o", "gpt-4o-mini", "text-embedding-3-small", "text-embedding-3-large", "deepseek-v3.1", "gemini-2.5-flash", "claude-sonnet-4.5", "openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5", "gemini-2.5-pro", "text-embedding-004", "bge-reranker-v2-m3"],
    rateLimitProfile: {
      requestMultiplier: 3,
      concurrencyMultiplier: 2
    },
    playgroundAccess: true,
    supportLabel: "Priority support",
    includedCreditsLabel: "No automatic recurring credits in this MVP",
    isPublic: true,
    sortOrder: 30
  },
  {
    id: PlanTier.ENTERPRISE,
    slug: "enterprise",
    label: "Enterprise",
    description: "For higher-volume usage, internal approvals, and custom operating limits.",
    publicSummary: "Contact-led access to higher limits and operational support; usage billing still applies.",
    allowedRoutePolicies: ["cheap", "balanced", "premium", "auto"],
    allowedModels: ["gpt-5.5", "gpt-5.5-pro", "gpt-5.4", "gpt-5.4-pro", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-4o", "gpt-4o-mini", "text-embedding-3-small", "text-embedding-3-large", "deepseek-v3.1", "gemini-2.5-flash", "claude-sonnet-4.5", "openai/gpt-4o-mini", "anthropic/claude-sonnet-4.5", "gemini-2.5-pro", "text-embedding-004", "bge-reranker-v2-m3"],
    rateLimitProfile: {
      requestMultiplier: 10,
      concurrencyMultiplier: 5
    },
    playgroundAccess: true,
    supportLabel: "Enterprise support",
    includedCreditsLabel: "Contract or admin-assigned credits only",
    isPublic: true,
    sortOrder: 40
  }
];

export function getPlanCatalogEntry(plan: PlanTier | null | undefined) {
  return PLAN_CATALOG.find((entry) => entry.id === plan) ?? PLAN_CATALOG.find((entry) => entry.id === DEFAULT_PLAN)!;
}

export function getPublicPlanCatalog() {
  return PLAN_CATALOG.filter((entry) => entry.isPublic).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatPlanName(plan: PlanTier | null | undefined) {
  return getPlanCatalogEntry(plan).label;
}
