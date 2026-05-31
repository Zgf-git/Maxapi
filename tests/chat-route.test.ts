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

describe("chat route balance and auth gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRequestProtection.mockResolvedValue({
      release: vi.fn()
    });
    assertChatEntitlement.mockResolvedValue({ plan: "BUILDER" });
    assertEstimatedChatRequestBudget.mockResolvedValue(undefined);
  });

  it("rejects insufficient balance before provider execution", async () => {
    const { ApiRouteError } = await import("@/lib/chat/errors");
    const { POST } = await import("@/app/v1/chat/completions/route");

    authenticateApiKey.mockResolvedValueOnce({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    assertSufficientBalance.mockRejectedValueOnce(
      new ApiRouteError(402, "insufficient_balance", "Insufficient balance for this request.")
    );
    createRequestLog.mockResolvedValueOnce({ id: "log-1" });

    const response = await POST(
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    expect(response.status).toBe(402);
    expect(executeChatCompletion).not.toHaveBeenCalled();
    expect(createRequestLog).toHaveBeenCalled();
  });

  it("rejects estimated request cost before provider execution", async () => {
    const { ApiRouteError } = await import("@/lib/chat/errors");
    const { POST } = await import("@/app/v1/chat/completions/route");

    authenticateApiKey.mockResolvedValueOnce({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    assertSufficientBalance.mockResolvedValueOnce(undefined);
    assertEstimatedChatRequestBudget.mockRejectedValueOnce(
      new ApiRouteError(402, "estimated_request_too_expensive", "Estimated request cost exceeds the maximum allowed per-request cost.")
    );
    createRequestLog.mockResolvedValueOnce({ id: "log-1" });

    const response = await POST(
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 100000
        })
      })
    );

    expect(response.status).toBe(402);
    expect(executeChatCompletion).not.toHaveBeenCalled();
    expect(createRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "estimated_request_too_expensive"
      })
    );
  });

  it("rejects disallowed plan entitlements before protection and provider execution", async () => {
    const { ApiRouteError } = await import("@/lib/chat/errors");
    const { POST } = await import("@/app/v1/chat/completions/route");

    authenticateApiKey.mockResolvedValueOnce({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    assertChatEntitlement.mockRejectedValueOnce(
      new ApiRouteError(403, "route_policy_not_allowed", "premium routing is not available on the Trial plan.")
    );
    createRequestLog.mockResolvedValueOnce({ id: "log-1" });

    const response = await POST(
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          route_policy: "premium",
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    expect(response.status).toBe(403);
    expect(enforceRequestProtection).not.toHaveBeenCalled();
    expect(assertSufficientBalance).not.toHaveBeenCalled();
    expect(executeChatCompletion).not.toHaveBeenCalled();
    expect(createRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "route_policy_not_allowed",
        routePolicy: "premium"
      })
    );
  });

  it("rejects revoked API keys before provider execution", async () => {
    const { POST } = await import("@/app/v1/chat/completions/route");

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
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }]
        })
      })
    );

    expect(response.status).toBe(403);
    expect(assertSufficientBalance).not.toHaveBeenCalled();
    expect(executeChatCompletion).not.toHaveBeenCalled();
  });
});
