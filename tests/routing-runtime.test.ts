import { beforeEach, describe, expect, it, vi } from "vitest";

const routePolicyConfigFindFirst = vi.fn();
const routePolicyConfigFindMany = vi.fn();
const routePolicyConfigFindUnique = vi.fn();
const routePolicyConfigUpsert = vi.fn();
const routePolicyConfigUpdate = vi.fn();
const createAuditLog = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    routePolicyConfig: {
      findFirst: routePolicyConfigFindFirst,
      findMany: routePolicyConfigFindMany,
      findUnique: routePolicyConfigFindUnique,
      upsert: routePolicyConfigUpsert,
      update: routePolicyConfigUpdate
    }
  }
}));

vi.mock("@/lib/audit/service", () => ({
  createAuditLog
}));

describe("routing runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routePolicyConfigFindFirst.mockResolvedValue(null);
    routePolicyConfigFindMany.mockResolvedValue([]);
    routePolicyConfigFindUnique.mockResolvedValue(null);
  });

  it("falls back to static targets when no database override exists", async () => {
    const { getRuntimeTargetsForRoutePolicy } = await import("@/lib/routing/runtime");
    const targets = await getRuntimeTargetsForRoutePolicy("balanced");

    expect(targets[0]).toEqual({ provider: "openai", model: "gpt-5.4" });
  });

  it("returns active database targets when present", async () => {
    routePolicyConfigFindFirst.mockResolvedValue({
      routePolicy: "cheap",
      status: "ACTIVE",
      targets: [{ provider: "apimart", model: "deepseek-v3.1" }]
    });

    const { getRuntimeTargetsForRoutePolicy } = await import("@/lib/routing/runtime");
    const targets = await getRuntimeTargetsForRoutePolicy("cheap");

    expect(targets).toEqual([{ provider: "apimart", model: "deepseek-v3.1" }]);
  });

  it("upserts route policy config and records audit metadata", async () => {
    routePolicyConfigUpsert.mockResolvedValue({
      id: "cfg_1",
      routePolicy: "premium",
      status: "ACTIVE",
      targets: [{ provider: "openai", model: "gpt-5.4-pro" }]
    });

    const { upsertRoutePolicyConfig } = await import("@/lib/routing/runtime");
    const record = await upsertRoutePolicyConfig({
      actorUserId: "admin_1",
      routePolicy: "premium",
      status: "ACTIVE",
      targets: [{ provider: "openai", model: "gpt-5.4-pro" }]
    });

    expect(record.routePolicy).toBe("premium");
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin_1",
        action: "routing.policy.upsert"
      })
    );
  });

  it("rejects unknown provider/model combinations in database overrides", async () => {
    const { upsertRoutePolicyConfig } = await import("@/lib/routing/runtime");

    await expect(
      upsertRoutePolicyConfig({
        actorUserId: "admin_1",
        routePolicy: "balanced",
        status: "ACTIVE",
        targets: [{ provider: "openai", model: "deepseek-v3.1" }]
      })
    ).rejects.toThrow("Unknown provider/model route target.");
  });
});
