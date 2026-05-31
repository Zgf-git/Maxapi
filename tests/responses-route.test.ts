import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateApiKey = vi.fn();
const assertSufficientBalance = vi.fn();
const assertEstimatedChatRequestBudget = vi.fn();
const executeChatCompletion = vi.fn();
const createRequestLog = vi.fn();
const enforceRequestProtection = vi.fn();
const assertChatEntitlement = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  authenticateApiKey
}));

vi.mock("@/lib/balance/service", () => ({
  assertSufficientBalance
}));

vi.mock("@/lib/billing/preflight", () => ({
  assertEstimatedChatRequestBudget
}));

vi.mock("@/lib/chat/service", () => ({
  executeChatCompletion
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

describe("responses route compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateApiKey.mockResolvedValue({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    assertSufficientBalance.mockResolvedValue(undefined);
    assertEstimatedChatRequestBudget.mockResolvedValue(undefined);
    assertChatEntitlement.mockResolvedValue({ plan: "BUILDER" });
    enforceRequestProtection.mockResolvedValue({ release: vi.fn() });
    executeChatCompletion.mockResolvedValue({
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
  });

  it("maps a basic Responses API request onto chat completions", async () => {
    const { POST } = await import("@/app/v1/responses/route");

    const response = await POST(
      new Request("http://localhost/v1/responses", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          instructions: "Be terse.",
          input: "Hello",
          max_output_tokens: 16
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      object: "response",
      output_text: "Hello back"
    });
    expect(executeChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "system", content: "Be terse." },
          { role: "user", content: "Hello" }
        ],
        max_tokens: 16
      }),
      expect.any(Object)
    );
  });
});
