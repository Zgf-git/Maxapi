import type { ProviderName, RoutePolicy } from "@/lib/providers/types";

export type RouteTarget = {
  provider: ProviderName;
  model: string;
};

export type RouteDecision = {
  requestedModel: string | null;
  requestedRoutePolicy: RoutePolicy | null;
  selectedProvider: ProviderName;
  selectedModel: string;
  fallbackProvider: ProviderName | null;
  fallbackModel: string | null;
  fallbackChain: RouteTarget[];
  routeReason: string;
  usedFallback: boolean;
};
