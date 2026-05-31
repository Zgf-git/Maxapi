import { PlanTier } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getPlanRateLimits } from "@/lib/plans/rate-limits";
import { checkChatEntitlement } from "@/lib/plans/entitlements";
import { getPublicPlanCatalog } from "@/lib/plans/catalog";
import { getAvailableCatalogForPlan } from "@/lib/plans/catalog-availability";
import {
  buildCurlExplicitModelExample,
  buildCurlRoutePolicyExample
} from "@/lib/quickstart/examples";

describe("plan catalog and entitlements", () => {
  it("blocks disallowed route policies and explicit models", () => {
    expect(() =>
      checkChatEntitlement(PlanTier.TRIAL, {
        model: undefined,
        route_policy: "premium"
      })
    ).toThrow(/not available on the Trial plan/);

    expect(() =>
      checkChatEntitlement(PlanTier.TRIAL, {
        model: "gpt-5.4-pro",
        route_policy: undefined
      })
    ).toThrow(/not available on the Trial plan/);
  });

  it("allows entitled policy and model access", () => {
    expect(() =>
      checkChatEntitlement(PlanTier.PRO, {
        model: "gpt-5.4-nano",
        route_policy: undefined
      })
    ).not.toThrow();

    expect(() =>
      checkChatEntitlement(PlanTier.BUILDER, {
        model: "gpt-4o-mini",
        route_policy: undefined
      })
    ).not.toThrow();
  });

  it("exposes public plans without hidden internal model ids", () => {
    const plans = getPublicPlanCatalog();

    expect(plans.map((plan) => plan.slug)).toEqual(["trial", "builder", "pro", "enterprise"]);
    expect(plans.flatMap((plan) => plan.allowedModels)).not.toContain("deepseek-reasoner");
  });

  it("scales rate-limit profiles by plan", () => {
    const base = {
      apiKeyPerMinute: 60,
      userPerMinute: 120,
      ipPerMinute: 300,
      concurrentApiKey: 4,
      concurrentUser: 10
    };

    expect(getPlanRateLimits(PlanTier.TRIAL, base)).toMatchObject({
      apiKeyPerMinute: 30,
      userPerMinute: 60,
      concurrentApiKey: 2,
      concurrentUser: 5
    });
    expect(getPlanRateLimits(PlanTier.PRO, base)).toMatchObject({
      apiKeyPerMinute: 180,
      userPerMinute: 360,
      concurrentApiKey: 8,
      concurrentUser: 20
    });
  });

  it("keeps the documented first-request examples Trial-safe", () => {
    const routePolicyExample = buildCurlRoutePolicyExample();
    const explicitModelExample = buildCurlExplicitModelExample();

    expect(routePolicyExample).toContain('"route_policy": "auto"');
    expect(explicitModelExample).toContain('"model": "gpt-4o"');
    expect(() =>
      checkChatEntitlement(PlanTier.TRIAL, {
        model: undefined,
        route_policy: "auto"
      })
    ).not.toThrow();
    expect(() =>
      checkChatEntitlement(PlanTier.TRIAL, {
        model: "gpt-4o",
        route_policy: undefined
      })
    ).not.toThrow();
  });

  it("returns Trial-safe playground defaults and selector entries", () => {
    const catalog = getAvailableCatalogForPlan(PlanTier.TRIAL);

    expect(catalog.defaultRoutePolicy).toBe("auto");
    expect(catalog.defaultModelId).toBe("gpt-5.4");
    expect(catalog.policies.map((policy) => policy.routePolicy)).toEqual(["auto"]);
    expect(catalog.models.map((model) => model.id)).toEqual([
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "text-embedding-3-small"
    ]);
  });
});
