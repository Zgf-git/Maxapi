import { describe, expect, it } from "vitest";

import {
  buildCacheKey,
  getCachedChatResponse,
  setCachedChatResponse
} from "@/lib/chat/cache";
import type { ChatCompletionRequestInput } from "@/lib/providers/types";

describe("chat cache", () => {
  const baseInput: ChatCompletionRequestInput = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello" }]
  };

  const baseResponse = {
    id: "cmpl-1",
    object: "chat.completion",
    created: 1,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: { role: "assistant" as const, content: "Hi there" }
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15
    }
  };

  it("builds deterministic cache keys for identical inputs", () => {
    const k1 = buildCacheKey(baseInput);
    const k2 = buildCacheKey(baseInput);

    expect(k1).toBe(k2);
    expect(k1.startsWith("chat:v1:")).toBe(true);
  });

  it("produces different keys for different inputs", () => {
    const k1 = buildCacheKey(baseInput);
    const k2 = buildCacheKey({ ...baseInput, temperature: 0.5 });

    expect(k1).not.toBe(k2);
  });

  it("round-trips a cached response", async () => {
    await setCachedChatResponse(baseInput, baseResponse, 60);
    const cached = await getCachedChatResponse(baseInput);

    expect(cached).not.toBeNull();
    expect(cached!.id).toBe("cmpl-1");
    expect(cached!.choices[0].message.content).toBe("Hi there");
  });

  it("does not cache streaming requests", async () => {
    const streamInput: ChatCompletionRequestInput = { ...baseInput, stream: true };

    await setCachedChatResponse(streamInput, baseResponse, 60);
    const cached = await getCachedChatResponse(streamInput);

    expect(cached).toBeNull();
  });

  it("preserves usage before caching so cache hits remain billable", async () => {
    await setCachedChatResponse(baseInput, baseResponse, 60);
    const cached = await getCachedChatResponse(baseInput);

    expect(cached).not.toBeNull();
    expect(cached!.usage).toEqual(baseResponse.usage);
  });

  it("returns null for uncached inputs", async () => {
    const key = buildCacheKey({
      model: "gpt-4o",
      messages: [{ role: "user", content: Math.random().toString() }]
    });

    const cached = await getCachedChatResponse({
      model: "gpt-4o",
      messages: [{ role: "user", content: Math.random().toString() }]
    });

    expect(cached).toBeNull();
  });
});
