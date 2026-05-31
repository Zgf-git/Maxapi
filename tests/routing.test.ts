import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    routePolicyConfig: {
      findFirst: vi.fn().mockResolvedValue(null)
    }
  }
}));

vi.mock("@/lib/routing/sticky", () => ({
  getStickyRouteBinding: vi.fn()
}));

import { resolveChatRoute } from "@/lib/routing/service";

describe("chat routing", () => {
  it("reuses sticky route bindings for route-policy requests when available", async () => {
    const stickyModule = await import("@/lib/routing/sticky");
    (
      stickyModule.getStickyRouteBinding as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({
      apiKeyId: "key-1",
      sessionId: "session-1",
      routePolicy: "balanced",
      provider: "apimart",
      model: "gemini-2.5-flash"
    });

    const result = await resolveChatRoute(
      {
        route_policy: "balanced",
        session_id: "session-1",
        messages: [{ role: "user", content: "Hello" }]
      },
      { apiKeyId: "key-1" }
    );

    expect(result.selectedProvider).toBe("apimart");
    expect(result.selectedModel).toBe("gemini-2.5-flash");
    expect(result.fallbackProvider).toBe("openai");
    expect(result.routeReason).toBe("route_policy:balanced:sticky_session");
  });

  it("routes explicit OpenAI models directly", async () => {
    const result = await resolveChatRoute({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result.selectedProvider).toBe("openai");
    expect(result.selectedModel).toBe("gpt-4o");
    expect(result.routeReason).toBe("explicit_model");
  });

  it("routes gpt-4o-mini to OpenAI", async () => {
    const result = await resolveChatRoute({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result.selectedProvider).toBe("openai");
    expect(result.selectedModel).toBe("gpt-4o-mini");
    expect(result.fallbackProvider).toBeNull();
  });

  it("routes balanced policy to the managed OpenAI target", async () => {
    const result = await resolveChatRoute({
      route_policy: "balanced",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result.selectedProvider).toBe("openai");
    expect(result.selectedModel).toBe("gpt-5.4");
    expect(result.fallbackProvider).toBe("apimart");
    expect(result.fallbackModel).toBe("gemini-2.5-flash");
    expect(result.routeReason).toBe("route_policy:balanced");
  });

  it("can sort route-policy targets by estimated model cost", async () => {
    const result = await resolveChatRoute({
      route_policy: "balanced",
      routing_strategy: "cost",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result.selectedProvider).toBe("apimart");
    expect(result.selectedModel).toBe("gemini-2.5-flash");
    expect(result.routeReason).toBe("route_policy:balanced:cost_strategy");
  });

  it("rejects unsupported models", async () => {
    await expect(() =>
      resolveChatRoute({
        model: "unsupported-model",
        messages: [{ role: "user", content: "Hello" }]
      })
    ).rejects.toThrow("Unsupported model");
  });

  it("requires model parameter", async () => {
    await expect(() =>
      resolveChatRoute({
        messages: [{ role: "user", content: "Hello" }]
      })
    ).rejects.toThrow("Either model or route_policy must be provided.");
  });
});
