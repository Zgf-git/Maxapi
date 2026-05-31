import {
  OBSERVABILITY_FALLBACK_OPTIONS,
  OBSERVABILITY_PROVIDERS,
  OBSERVABILITY_ROUTE_POLICIES,
  OBSERVABILITY_STATUSES,
  type ObservabilityFallbackUsed,
  type ObservabilityFilters,
  type ObservabilityProvider,
  type ObservabilityRoutePolicy,
  type ObservabilityStatus
} from "@/lib/observability/types";

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

export function normalizeObservabilityFilters(searchParams: SearchParamsInput): ObservabilityFilters {
  const provider = normalizeEnumValue(takeFirst(searchParams.provider), OBSERVABILITY_PROVIDERS) as ObservabilityProvider | undefined;
  const status = normalizeEnumValue(takeFirst(searchParams.status), OBSERVABILITY_STATUSES) as ObservabilityStatus | undefined;
  const routePolicy = normalizeEnumValue(
    takeFirst(searchParams.routePolicy),
    OBSERVABILITY_ROUTE_POLICIES
  ) as ObservabilityRoutePolicy | undefined;
  const fallbackUsed = normalizeEnumValue(
    takeFirst(searchParams.fallbackUsed),
    OBSERVABILITY_FALLBACK_OPTIONS
  ) as ObservabilityFallbackUsed | undefined;

  return {
    provider,
    status,
    routePolicy,
    fallbackUsed
  };
}

export function buildObservabilityFilterHref(filters: ObservabilityFilters) {
  const params = new URLSearchParams();

  if (filters.provider) {
    params.set("provider", filters.provider);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.routePolicy) {
    params.set("routePolicy", filters.routePolicy);
  }

  if (filters.fallbackUsed) {
    params.set("fallbackUsed", filters.fallbackUsed);
  }

  return params.toString();
}
