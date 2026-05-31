import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateApiKey = vi.fn();
const assertSufficientBalance = vi.fn();
const executeChatCompletion = vi.fn();
const createRequestLog = vi.fn();
const enforceRequestProtection = vi.fn();
const recordAbuseEvent = vi.fn();
const assertChatEntitlement = vi.fn();
const assertEstimatedChatRequestBudget = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  authenticateApiKey
}));

vi.mock("@/lib/balance/service", () => ({
  assertSufficientBalance
}));

vi.mock("@/lib/chat/service", () => ({
  executeChatCompletion
}));

vi.mock("@/lib/billing/preflight", () => ({
  assertEstimatedChatRequestBudget
}));

vi.mock("@/lib/plans/entitlements", () => ({
  assertChatEntitlement
}));

vi.mock("@/lib/request-logs/repository", () => ({
  createRequestLog
}));

vi.mock("@/lib/risk/protection", () => ({
  enforceRequestProtection
}));

vi.mock("@/lib/risk/events", () => ({
  recordAbuseEvent
}));

describe("completions route compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRequestProtection.mockResolvedValue({
      release: vi.fn()
    });
    assertChatEntitlement.mockResolvedValue({ plan: "BUILDER" });
    assertSufficientBalance.mockResolvedValue(undefined);
    assertEstimatedChatRequestBudget.mockResolvedValue(undefined);
  });

  it("translates chat output into text completions format", async () => {
    const { POST } = await import("@/app/v1/completions/route");

    authenticateApiKey.mockResolvedValueOnce({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    executeChatCompletion.mockResolvedValueOnce({
      kind: "json",
      status: 200,
      requestLogId: "log-1",
      body: {
        id: "chatcmpl-1",
        object: "chat.completion",
        created: 123,
        model: "gpt-4o-mini",
        choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Hello back" } }],
        usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 }
      }
    });

    const response = await POST(
      new Request("http://localhost/v1/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          prompt: "Hello"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      object: "text_completion",
      choices: [{ text: "Hello back", finish_reason: "stop" }]
    });
    expect(executeChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "Hello" }]
      }),
      expect.any(Object)
    );
  });

  it("rejects revoked API keys before provider execution", async () => {
    const { POST } = await import("@/app/v1/completions/route");

    authenticateApiKey.mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: "revoked_api_key",
      message: "This API key has been revoked.",
      apiKeyId: "key-1",
      userId: "user-1"
    });
    createRequestLog.mockResolvedValueOnce({ id: "log-1" });

    const response = await POST(
      new Request("http://localhost/v1/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          prompt: "Hello"
        })
      })
    );

    expect(response.status).toBe(403);
    expect(executeChatCompletion).not.toHaveBeenCalled();
  });
});
