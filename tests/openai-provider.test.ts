import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRouteError } from "@/lib/chat/errors";

const envLike = {
  OPENAI_API_KEY: "sk-fallback",
  OPENAI_API_KEYS: ["sk-key-1", "sk-key-2"],
  OPENAI_BASE_URL: "https://api.openai.com/v1"
};

vi.mock("@/lib/env", () => ({
  env: envLike
}));

describe("OpenAIChatProvider with key pool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Network error");
      })
    );
  });

  it("uses the first key on a successful request", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;

      if (auth === "Bearer sk-key-1") {
        return new Response(JSON.stringify({ id: "cmpl-1", choices: [] }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: { message: "wrong key" } }), { status: 401 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { OpenAIChatProvider } = await import("@/lib/providers/openai");
    const provider = new OpenAIChatProvider();

    const result = await provider.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "test-success" }]
    });

    expect(result.id).toBe("cmpl-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const authHeader = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;

    expect(authHeader.Authorization).toBe("Bearer sk-key-1");
  });

  it("retries with the next key on a retryable upstream error (429)", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;

      if (auth === "Bearer sk-key-1") {
        return new Response(JSON.stringify({ error: { message: "Rate limited" } }), { status: 429 });
      }

      return new Response(JSON.stringify({ id: "cmpl-2", choices: [] }), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { OpenAIChatProvider } = await import("@/lib/providers/openai");
    const provider = new OpenAIChatProvider();

    const result = await provider.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "test-retry-429" }]
    });

    expect(result.id).toBe("cmpl-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const auth2 = (fetchMock.mock.calls[1][1] as RequestInit).headers as Record<string, string>;

    expect(auth2.Authorization).toBe("Bearer sk-key-2");
  });

  it("retries with the next key on a network error", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;

      if (auth === "Bearer sk-key-1") {
        throw new Error("ECONNREFUSED");
      }

      return new Response(JSON.stringify({ id: "cmpl-3", choices: [] }), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { OpenAIChatProvider } = await import("@/lib/providers/openai");
    const provider = new OpenAIChatProvider();

    const result = await provider.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "test-network-error" }]
    });

    expect(result.id).toBe("cmpl-3");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after exhausting all keys", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { message: "Server error" } }), { status: 502 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { OpenAIChatProvider } = await import("@/lib/providers/openai");
    const provider = new OpenAIChatProvider();

    await expect(
      provider.createChatCompletion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test-exhaust" }]
      })
    ).rejects.toThrow(ApiRouteError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable errors (e.g. 401)", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ error: { message: "Invalid key" } }), { status: 401 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { OpenAIChatProvider } = await import("@/lib/providers/openai");
    const provider = new OpenAIChatProvider();

    await expect(
      provider.createChatCompletion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test-401" }]
      })
    ).rejects.toThrow(ApiRouteError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("streams with key pool fallback on retryable errors", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;

      if (auth === "Bearer sk-key-1") {
        return new Response(JSON.stringify({ error: { message: "Overloaded" } }), { status: 503 });
      }

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"choices":[]}\n\n'));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const { OpenAIChatProvider } = await import("@/lib/providers/openai");
    const provider = new OpenAIChatProvider();

    const result = await provider.streamChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "test-stream-fallback" }],
      stream: true
    });

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the selected upstream key base URL override for mixed key pools", async () => {
    const fetchMock = vi.fn(async (_url: string) => {
      return new Response(JSON.stringify({ error: { message: "Rate limited" } }), { status: 429 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { createProviderKeyPool } = await import("@/lib/providers/key-pool");
    const { OpenAICompatibleProvider } = await import("@/lib/providers/openai-compatible");
    const provider = new OpenAICompatibleProvider({
      provider: "openai",
      baseUrl: "https://default.example/v1",
      keyPool: createProviderKeyPool("openai", [
        { id: "key-1", apiKey: "sk-1", baseUrlOverride: "https://first.example/v1" },
        { id: "key-2", apiKey: "sk-2", baseUrlOverride: "https://second.example/v1" }
      ])
    });

    await expect(
      provider.createChatCompletion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test-base-url-override" }]
      })
    ).rejects.toThrow(ApiRouteError);

    expect(String(fetchMock.mock.calls[0][0])).toBe("https://first.example/v1/chat/completions");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://second.example/v1/chat/completions");
  });
});
