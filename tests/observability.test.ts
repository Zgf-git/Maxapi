import { describe, expect, it } from "vitest";

import { normalizeObservabilityFilters } from "@/lib/observability/filters";
import { buildObservabilitySummary, filterObservabilityRows } from "@/lib/observability/service";
import type { ObservabilityRow } from "@/lib/observability/types";

const rows: ObservabilityRow[] = [
  {
    id: "1",
    createdAt: new Date("2026-04-18T00:00:00Z"),
    requestType: "CHAT_COMPLETION",
    requestedRoutePolicy: "cheap",
    requestedModel: null,
    actualProvider: "openai",
    actualUpstreamModel: "gpt-4o-mini",
    fallbackUsed: false,
    fallbackFromProvider: null,
    fallbackFromModel: null,
    routeReason: "route_policy:cheap",
    status: "SUCCESS",
    latencyMs: 120,
    totalTokens: 100,
    totalCostUsdMicros: 420n,
    errorCode: null,
    errorMessage: null
  },
  {
    id: "2",
    createdAt: new Date("2026-04-18T01:00:00Z"),
    requestType: "CHAT_COMPLETION",
    requestedRoutePolicy: "balanced",
    requestedModel: null,
    actualProvider: "openai",
    actualUpstreamModel: "gpt-4o-mini",
    fallbackUsed: true,
    fallbackFromProvider: "openai",
    fallbackFromModel: "gpt-4o",
    routeReason: "route_policy:balanced:fallback_retryable_upstream",
    status: "SUCCESS",
    latencyMs: 220,
    totalTokens: 140,
    totalCostUsdMicros: 450n,
    errorCode: null,
    errorMessage: null
  },
  {
    id: "3",
    createdAt: new Date("2026-04-18T02:00:00Z"),
    requestType: "CHAT_COMPLETION",
    requestedRoutePolicy: "premium",
    requestedModel: null,
    actualProvider: "openai",
    actualUpstreamModel: "gpt-4o",
    fallbackUsed: false,
    fallbackFromProvider: null,
    fallbackFromModel: null,
    routeReason: "route_policy:premium",
    status: "ERROR",
    latencyMs: 300,
    totalTokens: null,
    totalCostUsdMicros: null,
    errorCode: "upstream_error",
    errorMessage: "Upstream provider error."
  }
];

describe("observability filtering", () => {
  it("filters by provider, status, route policy, and fallback flag", () => {
    expect(filterObservabilityRows(rows, { provider: "openai" })).toHaveLength(3);
    expect(filterObservabilityRows(rows, { status: "SUCCESS" })).toHaveLength(2);
    expect(filterObservabilityRows(rows, { routePolicy: "cheap" })).toHaveLength(1);
    expect(filterObservabilityRows(rows, { fallbackUsed: "true" })).toHaveLength(1);
    expect(filterObservabilityRows(rows, { provider: "openai", status: "ERROR" })).toHaveLength(1);
  });

  it("normalizes known filter values and drops invalid ones", () => {
    expect(
      normalizeObservabilityFilters({
        provider: " OPENAI ",
        status: "success",
        routePolicy: "ALL",
        fallbackUsed: "maybe"
      })
    ).toEqual({
      provider: "openai",
      status: "SUCCESS",
      routePolicy: undefined,
      fallbackUsed: undefined
    });
  });

  it("derives truthful summary cards from the recent rows", () => {
    const summary = buildObservabilitySummary(rows);

    expect(summary.requestsLast24h).toBe(3);
    expect(summary.successRate).toBeCloseTo(2 / 3);
    expect(summary.fallbackRate).toBeCloseTo(1 / 3);
    expect(summary.totalSpendUsdMicros).toBe(870n);
    expect(summary.topProvider).toEqual({
      provider: "openai",
      totalSpendUsdMicros: 870n
    });
  });

  it("builds a zero summary when no rows are present", () => {
    const summary = buildObservabilitySummary([]);

    expect(summary.requestsLast24h).toBe(0);
    expect(summary.successRate).toBe(0);
    expect(summary.fallbackRate).toBe(0);
    expect(summary.totalSpendUsdMicros).toBe(0n);
    expect(summary.topProvider).toBeNull();
  });
});
