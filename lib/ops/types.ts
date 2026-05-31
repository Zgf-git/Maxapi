import type { RequestLogStatus } from "@prisma/client";
import { listProviderDefinitions } from "@/lib/providers/catalog";
import { ROUTE_POLICIES, type ProviderName } from "@/lib/providers/types";

export const OPS_TIME_WINDOWS = ["24h", "7d", "30d"] as const;
export const OPS_PROVIDERS = listProviderDefinitions().map(({ slug }) => slug) as ProviderName[];
export const OPS_ROUTE_POLICIES = [...ROUTE_POLICIES, "explicit"] as const;
export const OPS_STATUSES = ["SUCCESS", "ERROR"] as const;
export const OPS_FALLBACK_OPTIONS = ["true", "false"] as const;

export type OpsTimeWindow = (typeof OPS_TIME_WINDOWS)[number];
export type OpsProvider = ProviderName;
export type OpsRoutePolicy = (typeof OPS_ROUTE_POLICIES)[number];
export type OpsStatus = (typeof OPS_STATUSES)[number];
export type OpsFallbackUsed = (typeof OPS_FALLBACK_OPTIONS)[number];

export type OpsFilters = {
  window: OpsTimeWindow;
  provider?: OpsProvider;
  routePolicy?: OpsRoutePolicy;
  status?: OpsStatus;
  fallbackUsed?: OpsFallbackUsed;
};

export type OpsRequestMetricInput = {
  id: string;
  createdAt: Date;
  userId: string | null;
  requestedModel: string | null;
  requestedRoutePolicy: string | null;
  actualProvider: string;
  actualUpstreamModel: string | null;
  fallbackUsed: boolean;
  fallbackFromProvider: string | null;
  fallbackFromModel: string | null;
  status: RequestLogStatus;
  latencyMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  revenueUsdMicros: bigint;
  providerCostUsdMicros: bigint;
  totalTokens: number | null;
};

export type OpsSummary = {
  requestCount: number;
  successRate: number;
  fallbackRate: number;
  revenueUsdMicros: bigint;
  providerCostUsdMicros: bigint;
  grossMarginUsdMicros: bigint;
  grossMarginRate: number | null;
  worstFailureSource: string | null;
};

export type OpsBreakdownRow = {
  key: string;
  requestCount: number;
  successRate: number;
  fallbackRate: number;
  averageLatencyMs: number | null;
  revenueUsdMicros: bigint;
  providerCostUsdMicros: bigint;
  grossMarginUsdMicros: bigint;
  averageMarginUsdMicros: bigint;
  topActualPath: string | null;
};

export type OpsFallbackRow = {
  path: string;
  requestCount: number;
  successRate: number;
  revenueUsdMicros: bigint;
  providerCostUsdMicros: bigint;
};

export type OpsFailureRow = {
  id: string;
  createdAt: Date;
  userId: string | null;
  requestedIntent: string;
  actualPath: string;
  fallbackUsed: boolean;
  status: RequestLogStatus;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  revenueUsdMicros: bigint;
  providerCostUsdMicros: bigint;
};

export type OpsAbuseEventRow = {
  id: string;
  createdAt: Date;
  userId: string | null;
  apiKeyId: string | null;
  eventType: string;
  severity: string;
  status: string;
  reasonCode: string;
  routePolicy: string | null;
  requestedModel: string | null;
};

export type OpsAbuseReasonRow = {
  reasonCode: string;
  count: number;
};

export type OpsDashboardData = {
  filters: OpsFilters;
  summary: OpsSummary;
  policyRows: OpsBreakdownRow[];
  providerRows: OpsBreakdownRow[];
  fallbackRows: OpsFallbackRow[];
  marginRows: OpsBreakdownRow[];
  recentFailures: OpsFailureRow[];
  recentAbuseEvents: OpsAbuseEventRow[];
  abuseReasonRows: OpsAbuseReasonRow[];
};
