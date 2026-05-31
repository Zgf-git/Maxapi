import type { RequestLogStatus, RequestType } from "@prisma/client";
import { listProviderDefinitions } from "@/lib/providers/catalog";
import { ROUTE_POLICIES, type ProviderName } from "@/lib/providers/types";

export const OBSERVABILITY_PROVIDERS = listProviderDefinitions().map(({ slug }) => slug) as ProviderName[];
export const OBSERVABILITY_STATUSES = ["SUCCESS", "ERROR"] as const;
export const OBSERVABILITY_ROUTE_POLICIES = ROUTE_POLICIES;
export const OBSERVABILITY_FALLBACK_OPTIONS = ["true", "false"] as const;

export type ObservabilityProvider = ProviderName;
export type ObservabilityStatus = (typeof OBSERVABILITY_STATUSES)[number];
export type ObservabilityRoutePolicy = (typeof OBSERVABILITY_ROUTE_POLICIES)[number];
export type ObservabilityFallbackUsed = (typeof OBSERVABILITY_FALLBACK_OPTIONS)[number];

export type ObservabilityFilters = {
  provider?: ObservabilityProvider;
  status?: ObservabilityStatus;
  routePolicy?: ObservabilityRoutePolicy;
  fallbackUsed?: ObservabilityFallbackUsed;
};

export type ObservabilityRow = {
  id: string;
  createdAt: Date;
  requestType: RequestType;
  requestedRoutePolicy: string | null;
  requestedModel: string | null;
  actualProvider: string;
  actualUpstreamModel: string | null;
  fallbackUsed: boolean;
  fallbackFromProvider: string | null;
  fallbackFromModel: string | null;
  routeReason: string | null;
  status: RequestLogStatus;
  latencyMs: number | null;
  totalTokens: number | null;
  totalCostUsdMicros: bigint | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type ObservabilitySummary = {
  requestsLast24h: number;
  successRate: number;
  fallbackRate: number;
  totalSpendUsdMicros: bigint;
  topProvider:
    | {
        provider: string;
        totalSpendUsdMicros: bigint;
      }
    | null;
  spendByProvider: Array<{
    provider: string;
    totalSpendUsdMicros: bigint;
  }>;
};
