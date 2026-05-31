import {
  OPS_FALLBACK_OPTIONS,
  OPS_PROVIDERS,
  OPS_ROUTE_POLICIES,
  OPS_STATUSES,
  OPS_TIME_WINDOWS,
  type OpsFallbackUsed,
  type OpsFilters,
  type OpsProvider,
  type OpsRoutePolicy,
  type OpsStatus,
  type OpsTimeWindow
} from "@/lib/ops/types";

type SearchParamsInput = Record<string, string | string[] | undefined>;

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeEnumValue<T extends readonly string[]>(value: string | undefined, allowedValues: T): T[number] | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue || normalizedValue === "all") {
    return undefined;
  }

  return allowedValues.find((allowedValue) => allowedValue.toLowerCase() === normalizedValue);
}

export function normalizeOpsFilters(searchParams: SearchParamsInput): OpsFilters {
  const window =
    (normalizeEnumValue(takeFirst(searchParams.window), OPS_TIME_WINDOWS) as OpsTimeWindow | undefined) ?? "24h";
  const provider = normalizeEnumValue(takeFirst(searchParams.provider), OPS_PROVIDERS) as OpsProvider | undefined;
  const routePolicy = normalizeEnumValue(takeFirst(searchParams.routePolicy), OPS_ROUTE_POLICIES) as
    | OpsRoutePolicy
    | undefined;
  const status = normalizeEnumValue(takeFirst(searchParams.status), OPS_STATUSES) as OpsStatus | undefined;
  const fallbackUsed = normalizeEnumValue(takeFirst(searchParams.fallbackUsed), OPS_FALLBACK_OPTIONS) as
    | OpsFallbackUsed
    | undefined;

  return {
    window,
    provider,
    routePolicy,
    status,
    fallbackUsed
  };
}

export function buildOpsFilterHref(filters: OpsFilters) {
  const params = new URLSearchParams();

  params.set("window", filters.window);

  if (filters.provider) {
    params.set("provider", filters.provider);
  }

  if (filters.routePolicy) {
    params.set("routePolicy", filters.routePolicy);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.fallbackUsed) {
    params.set("fallbackUsed", filters.fallbackUsed);
  }

  return params.toString();
}
