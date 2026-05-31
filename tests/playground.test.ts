import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  apiKey: {
    findFirst: vi.fn(),
    updateMany: vi.fn()
  },
  requestLog: {
    findFirst: vi.fn(),
    create: vi.fn()
  },
  abuseEvent: {
    create: vi.fn(),
    count: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    updateMany: vi.fn()
  }
};
const assertSufficientBalance = vi.fn();
const assertChatEntitlement = vi.fn();
const enforceRequestProtection = vi.fn();
const executeChatCompletion = vi.fn();

vi.mock("@/lib/db", () => ({
  db
}));

vi.mock("@/lib/balance/service", () => ({
  assertSufficientBalance
}));

vi.mock("@/lib/plans/entitlements", () => ({
  assertChatEntitlement
}));

vi.mock("@/lib/risk/protection", () => ({
  enforceRequestProtection
}));

vi.mock("@/lib/chat/service", () => ({
  executeChatCompletion
}));

const requestLogRow = {
  id: "req_1",
  createdAt: new Date("2026-04-19T00:00:00Z"),
  requestedModel: null,
  routePolicy: "balanced",
  provider: "openai",
  upstreamModel: "gpt-4o-mini",
  fallbackUsed: false,
  fallbackFromProvider: null,
  fallbackFromModel: null,
  routeReason: "route_policy:balanced",
  status: "SUCCESS",
  latencyMs: 123,
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  errorCode: null,
  errorMessage: null,
  usageLedgerEntry: {
    totalCostUsdMicros: 300n,
    status: "FINALIZED"
  }
};

describe("playground execution service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.apiKey.findFirst.mockResolvedValue({ id: "key_1" });
    db.requestLog.findFirst.mockResolvedValue(requestLogRow);
    db.requestLog.create.mockResolvedValue({
      ...requestLogRow,
      id: "req_error",
      status: "ERROR",
      errorCode: "playground_streaming_not_supported",
      errorMessage: "Dashboard playground streaming playback is not available yet."
    });
    db.abuseEvent.create.mockResolvedValue({ id: "abuse_1" });
    db.abuseEvent.count.mockResolvedValue(0);
    db.user.findUnique.mockResolvedValue({ plan: "BUILDER" });
    db.user.updateMany.mockResolvedValue({ count: 0 });
    db.apiKey.updateMany.mockResolvedValue({ count: 0 });
    assertSufficientBalance.mockResolvedValue(undefined);
    assertChatEntitlement.mockResolvedValue({ plan: "BUILDER" });
    enforceRequestProtection.mockResolvedValue({ release: vi.fn() });
    executeChatCompletion.mockResolvedValue({
      kind: "json",
      status: 200,
      requestLogId: "req_1",
      body: {
        id: "cmpl_1",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: "Hello from the playground."
            }
          }
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      }
    });
  });

  it("requires an active server-side API key and does not execute without one", async () => {
    db.apiKey.findFirst.mockResolvedValue(null);
    const { executePlaygroundRequest } = await import("@/lib/playground/service");

    const result = await executePlaygroundRequest("user_1", {
      route_policy: "balanced",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result).toMatchObject({
      ok: false,
      code: "no_active_api_key"
    });
    expect(enforceRequestProtection).not.toHaveBeenCalled();
    expect(executeChatCompletion).not.toHaveBeenCalled();
  });

  it("executes through protection, balance, and chat service hooks", async () => {
    const { executePlaygroundRequest } = await import("@/lib/playground/service");

    const result = await executePlaygroundRequest("user_1", {
      route_policy: "balanced",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(enforceRequestProtection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        apiKeyId: "key_1",
        routePolicy: "balanced"
      })
    );
    expect(assertSufficientBalance).toHaveBeenCalledWith("user_1");
    expect(executeChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        route_policy: "balanced"
      }),
      {
        userId: "user_1",
        apiKeyId: "key_1"
      }
    );
    expect(result).toMatchObject({
      ok: true,
      assistantText: "Hello from the playground.",
      detail: {
        requestLogId: "req_1",
        actualProvider: "openai",
        actualUpstreamModel: "gpt-4o-mini",
        totalCostUsdMicros: "300"
      }
    });
    expect(JSON.stringify(result)).not.toContain("mk_live");
    expect(JSON.stringify(result)).not.toContain("Authorization");
  });

  it("rejects dashboard streaming playback without calling the provider path", async () => {
    const { executePlaygroundRequest } = await import("@/lib/playground/service");
    db.requestLog.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...requestLogRow,
      id: "req_error",
      status: "ERROR",
      errorCode: "playground_streaming_not_supported",
      errorMessage: "Dashboard playground streaming playback is not available yet."
    });

    const result = await executePlaygroundRequest("user_1", {
      route_policy: "balanced",
      stream: true,
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result).toMatchObject({
      ok: false,
      code: "playground_streaming_not_supported"
    });
    expect(enforceRequestProtection).not.toHaveBeenCalled();
    expect(assertSufficientBalance).not.toHaveBeenCalled();
    expect(executeChatCompletion).not.toHaveBeenCalled();
    expect(db.requestLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          apiKeyId: "key_1",
          userId: "user_1",
          provider: "platform",
          routePolicy: "balanced",
          isStream: true,
          status: "ERROR",
          errorCode: "playground_streaming_not_supported"
        })
      })
    );
  });

  it("logs insufficient-balance playground blocks and records an abuse event", async () => {
    const { ApiRouteError } = await import("@/lib/chat/errors");
    const { executePlaygroundRequest } = await import("@/lib/playground/service");
    db.requestLog.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...requestLogRow,
      id: "req_balance",
      status: "ERROR",
      errorCode: "insufficient_balance",
      errorMessage: "Insufficient balance for this request."
    });
    assertSufficientBalance.mockRejectedValueOnce(
      new ApiRouteError(402, "insufficient_balance", "Insufficient balance for this request.")
    );

    const result = await executePlaygroundRequest("user_1", {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result).toMatchObject({
      ok: false,
      code: "insufficient_balance",
      detail: {
        requestLogId: "req_balance"
      }
    });
    expect(executeChatCompletion).not.toHaveBeenCalled();
    expect(db.requestLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedModel: "gpt-4o-mini",
          routePolicy: null,
          errorCode: "insufficient_balance"
        })
      })
    );
    expect(db.abuseEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "balance_hammer",
          reasonCode: "insufficient_balance",
          apiKeyId: "key_1",
          userId: "user_1"
        })
      })
    );
  });

  it("sanitizes upstream authentication errors before returning them to the dashboard", async () => {
    const { ApiRouteError } = await import("@/lib/chat/errors");
    const { executePlaygroundRequest } = await import("@/lib/playground/service");

    executeChatCompletion.mockRejectedValueOnce(
      new ApiRouteError(
        502,
        "upstream_error",
        "Incorrect API key provided: test-openai-secret-key. You can find your API key at https://platform.openai.com/account/api-keys."
      )
    );
    db.requestLog.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...requestLogRow,
      id: "req_auth",
      status: "ERROR",
      errorCode: "upstream_error",
      errorMessage: "Upstream provider authentication failed."
    });

    const result = await executePlaygroundRequest("user_1", {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }]
    });

    expect(result).toMatchObject({
      ok: false,
      code: "upstream_error",
      message: "Upstream provider authentication failed."
    });
    expect(JSON.stringify(result)).not.toContain("test-openai-secret-key");
    expect(JSON.stringify(result)).not.toContain("platform.openai.com");
  });
});
