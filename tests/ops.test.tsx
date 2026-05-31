import React from "react";
import { RequestLogStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { normalizeOpsFilters } from "@/lib/ops/filters";
import { buildOpsDashboardData, buildOpsSummary } from "@/lib/ops/service";
import type { OpsRequestMetricInput } from "@/lib/ops/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
}));

vi.mock("@/components/i18n/i18n-provider", () => ({
  useI18n: () => ({ locale: "en", setLocale: () => {} })
}));

const rows: OpsRequestMetricInput[] = [
  {
    id: "req_1",
    createdAt: new Date("2026-04-18T00:00:00Z"),
    userId: "user_1",
    requestedModel: null,
    requestedRoutePolicy: "cheap",
    actualProvider: "apimart",
    actualUpstreamModel: "deepseek-v3.1",
    fallbackUsed: false,
    fallbackFromProvider: null,
    fallbackFromModel: null,
    status: RequestLogStatus.SUCCESS,
    latencyMs: 100,
    errorCode: null,
    errorMessage: null,
    revenueUsdMicros: 1_000n,
    providerCostUsdMicros: 700n,
    totalTokens: 100
  },
  {
    id: "req_2",
    createdAt: new Date("2026-04-18T01:00:00Z"),
    userId: "user_2",
    requestedModel: null,
    requestedRoutePolicy: "balanced",
    actualProvider: "openai",
    actualUpstreamModel: "gpt-5.4",
    fallbackUsed: true,
    fallbackFromProvider: "apimart",
    fallbackFromModel: "deepseek-v3.1",
    status: RequestLogStatus.SUCCESS,
    latencyMs: 200,
    errorCode: null,
    errorMessage: null,
    revenueUsdMicros: 2_000n,
    providerCostUsdMicros: 2_500n,
    totalTokens: 250
  },
  {
    id: "req_3",
    createdAt: new Date("2026-04-18T02:00:00Z"),
    userId: "user_3",
    requestedModel: "gpt-5.4",
    requestedRoutePolicy: null,
    actualProvider: "openai",
    actualUpstreamModel: "gpt-5.4",
    fallbackUsed: false,
    fallbackFromProvider: null,
    fallbackFromModel: null,
    status: RequestLogStatus.ERROR,
    latencyMs: null,
    errorCode: "upstream_error",
    errorMessage: "sanitized provider failure",
    revenueUsdMicros: 0n,
    providerCostUsdMicros: 0n,
    totalTokens: null
  }
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ops dashboard access", () => {
  it("allows only explicitly configured internal operator emails", async () => {
    vi.resetModules();
    vi.stubEnv("INTERNAL_OPS_EMAILS", "ops@example.com, admin@example.com");
    const { canAccessOpsDashboard } = await import("@/lib/ops/access");

    expect(canAccessOpsDashboard("ops@example.com")).toBe(true);
    expect(canAccessOpsDashboard("OPS@example.com")).toBe(true);
    expect(canAccessOpsDashboard("user@example.com")).toBe(false);
  });

  it("hides billing and referral navigation when those surfaces are disabled", () => {
    const html = renderToStaticMarkup(<DashboardSidebar showBilling={false} showReferral={false} />);

    expect(html).not.toContain("/dashboard/billing");
    expect(html).not.toContain("/dashboard/referral");
  });
});

describe("rbac helpers", () => {
  it("grants admin console access to role-based staff and legacy ops emails", async () => {
    vi.resetModules();
    vi.stubEnv("INTERNAL_OPS_EMAILS", "ops@example.com");
    const { canViewAdmin } = await import("@/lib/access/rbac");

    expect(canViewAdmin({ id: "1", email: "ops@example.com", role: UserRole.USER })).toBe(true);
    expect(canViewAdmin({ id: "2", email: "admin@example.com", role: UserRole.ADMIN })).toBe(true);
    expect(canViewAdmin({ id: "3", email: "user@example.com", role: UserRole.USER })).toBe(false);
  });
});

describe("ops dashboard aggregation", () => {
  it("builds filtered-window summary metrics from full input rows", () => {
    const summary = buildOpsSummary(rows);

    expect(summary.requestCount).toBe(3);
    expect(summary.successRate).toBeCloseTo(2 / 3);
    expect(summary.fallbackRate).toBeCloseTo(1 / 3);
    expect(summary.revenueUsdMicros).toBe(3_000n);
    expect(summary.providerCostUsdMicros).toBe(3_200n);
    expect(summary.grossMarginUsdMicros).toBe(-200n);
    expect(summary.worstFailureSource).toBe("openai");
  });

  it("separates requested policy from actual provider/model execution", () => {
    const data = buildOpsDashboardData(
      {
        window: "24h"
      },
      rows
    );

    expect(data.policyRows.map((row) => row.key)).toEqual(["cheap", "balanced", "explicit model"]);
    expect(data.providerRows.find((row) => row.key === "openai")?.requestCount).toBe(2);
    expect(data.providerRows.find((row) => row.key === "apimart")?.requestCount).toBe(1);
    expect(data.fallbackRows[0]).toMatchObject({
      path: "apimart / deepseek-v3.1 -> openai / gpt-5.4",
      requestCount: 1,
      revenueUsdMicros: 2_000n,
      providerCostUsdMicros: 2_500n
    });
  });

});

describe("ops filters", () => {
  it("normalizes supported query params and drops unknown values", () => {
    expect(
      normalizeOpsFilters({
        window: "7d",
        provider: "openai",
        routePolicy: "explicit",
        status: "SUCCESS",
        fallbackUsed: "true"
      })
    ).toEqual({
      window: "7d",
      provider: "openai",
      routePolicy: "explicit",
      status: "SUCCESS",
      fallbackUsed: "true"
    });

    expect(
      normalizeOpsFilters({
        window: "bad",
        provider: "unknown",
        routePolicy: "all"
      })
    ).toEqual({
      window: "24h",
      provider: undefined,
      routePolicy: undefined,
      status: undefined,
      fallbackUsed: undefined
    });
  });
});
