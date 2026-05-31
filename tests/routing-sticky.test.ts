import { describe, expect, it, vi } from "vitest";

describe("sticky route config", () => {
  it("uses env-configured sticky ttl when persisting bindings", async () => {
    vi.resetModules();
    vi.stubEnv("ROUTING_STICKY_TTL_SECONDS", "7200");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result: "OK" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { setStickyRouteBinding } = await import("@/lib/routing/sticky");

    await setStickyRouteBinding({
      apiKeyId: "key-1",
      sessionId: "session-1",
      routePolicy: "balanced",
      provider: "openai",
      model: "gpt-5.4"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String((fetchMock.mock.calls as any[][])[0]?.[0] ?? "");
    expect(requestUrl).toContain("/7200/");
  });
});
