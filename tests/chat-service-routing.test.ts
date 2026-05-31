import { beforeEach, describe, expect, it, vi } from "vitest";

const openaiCreate = vi.fn();
const openaiStream = vi.fn();
const createRequestLog = vi.fn();
const updateRequestLog = vi.fn();
const finalizeUsageCharge = vi.fn();
const markUsageLedgerState = vi.fn();
const markApiKeyAuthenticatedUsage = vi.fn();
const setStickyRouteBinding = vi.fn();
const getStickyRouteBinding = vi.fn();
const getRuntimeTargetsForRoutePolicy = vi.fn();

vi.mock("@/lib/providers/registry", () => ({
  getChatProvider: vi.fn(() => ({
    createChatCompletion: openaiCreate,
    streamChatCompletion: openaiStream
  }))
}));

vi.mock("@/lib/request-logs/repository", () => ({
  createRequestLog,
  updateRequestLog
}));

vi.mock("@/lib/billing/ledger", () => ({
  finalizeUsageCharge,
  markUsageLedgerState
}));

vi.mock("@/lib/api-auth", () => ({
  markApiKeyAuthenticatedUsage
}));

vi.mock("@/lib/routing/sticky", () => ({
  getStickyRouteBinding,
  setStickyRouteBinding
}));

vi.mock("@/lib/routing/runtime", () => ({
  getRuntimeTargetsForRoutePolicy
}));

describe("chat service routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRequestLog.mockResolvedValue({ id: "log-1" });
    updateRequestLog.mockResolvedValue(undefined);
    finalizeUsageCharge.mockResolvedValue(undefined);
    markUsageLedgerState.mockResolvedValue(undefined);
    markApiKeyAuthenticatedUsage.mockResolvedValue(undefined);
    getStickyRouteBinding.mockResolvedValue(null);
    getRuntimeTargetsForRoutePolicy.mockResolvedValue([
      { provider: "openai", model: "gpt-5.4" },
      { provider: "apimart", model: "gemini-2.5-flash" },
      { provider: "openai", model: "gpt-4o" }
    ]);
  });

  it("executes explicit OpenAI model and logs the provider/model", async () => {
    openaiCreate.mockResolvedValueOnce({
      id: "cmpl-1",
      object: "chat.completion",
      created: 1,
      model: "gpt-4o",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Hi" } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    });

    const { executeChatCompletion } = await import("@/lib/chat/service");

    const result = await executeChatCompletion(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }]
      },
      { apiKeyId: "key-1", userId: "user-1" }
    );

    expect(result.kind).toBe("json");
    expect(createRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        upstreamModel: "gpt-4o",
        requestedModel: "gpt-4o",
        fallbackUsed: false
      })
    );
    expect(finalizeUsageCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        upstreamModel: "gpt-4o",
        requestedModel: "gpt-4o"
      })
    );
    expect(setStickyRouteBinding).not.toHaveBeenCalled();
  });

  it("bills gpt-4o-mini execution using the actual provider/model", async () => {
    openaiCreate.mockResolvedValueOnce({
      id: "cmpl-mini",
      object: "chat.completion",
      created: 1,
      model: "gpt-4o-mini",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Hi" } }],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 5,
        total_tokens: 25
      }
    });

    const { executeChatCompletion } = await import("@/lib/chat/service");

    await executeChatCompletion(
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }]
      },
      { apiKeyId: "key-1", userId: "user-1" }
    );

    expect(finalizeUsageCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        requestedModel: "gpt-4o-mini",
        upstreamModel: "gpt-4o-mini"
      })
    );
  });

  it("does not retry on non-retryable upstream failures", async () => {
    openaiCreate.mockRejectedValueOnce(
      new (await import("@/lib/chat/errors")).ApiRouteError(
        502,
        "upstream_error",
        "Bad upstream request.",
        "non_retryable_upstream_error"
      )
    );

    const { executeChatCompletion } = await import("@/lib/chat/service");

    await expect(
      executeChatCompletion(
        {
          model: "gpt-4o",
          messages: [{ role: "user", content: "Hello" }]
        },
        { apiKeyId: "key-1", userId: "user-1" }
      )
    ).rejects.toThrow("Bad upstream request.");
  });

  it("stores sticky route bindings for route-policy sessions after success", async () => {
    openaiCreate.mockResolvedValueOnce({
      id: "cmpl-sticky",
      object: "chat.completion",
      created: 1,
      model: "gpt-5.4",
      choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Hi" } }],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 4,
        total_tokens: 12
      }
    });

    const { executeChatCompletion } = await import("@/lib/chat/service");

    await executeChatCompletion(
      {
        route_policy: "balanced",
        session_id: "thread-1",
        messages: [{ role: "user", content: "Hello" }]
      },
      { apiKeyId: "key-1", userId: "user-1" }
    );

    expect(setStickyRouteBinding).toHaveBeenCalledWith({
      apiKeyId: "key-1",
      sessionId: "thread-1",
      routePolicy: "balanced",
      provider: "openai",
      model: "gpt-5.4"
    });
  });
});
