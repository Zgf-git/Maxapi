import type { ProviderName, RoutePolicy } from "@/lib/providers/types";
import type { RouteTarget } from "@/lib/routing/types";

export type CatalogPricingDisplayType = "per_token" | "policy" | "custom";

export type CatalogExplicitModelEntry = {
  kind: "model";
  id: string;
  label: string;
  description: string;
  provider: ProviderName;
  upstreamModel: string;
  category: "chat" | "embedding" | "rerank";
  supportsStreaming: boolean;
  supportsTools: boolean;
  isPublic: boolean;
  isDefault: boolean;
  status: "active" | "beta" | "hidden";
  recommendedFor: string[];
  pricingDisplayType: CatalogPricingDisplayType;
  pricingReference: string;
  docsSlug: string;
  sortOrder: number;
};

export type CatalogPolicyEntry = {
  kind: "policy";
  id: RoutePolicy;
  label: string;
  description: string;
  routePolicy: RoutePolicy;
  targets: RouteTarget[];
  defaultProvider: ProviderName;
  defaultModel: string;
  fallbackProvider: ProviderName | null;
  fallbackModel: string | null;
  recommendedFor: string[];
  pricingDisplayType: CatalogPricingDisplayType;
  docsSlug: string;
  sortOrder: number;
};

export type CatalogEntry = CatalogExplicitModelEntry | CatalogPolicyEntry;
