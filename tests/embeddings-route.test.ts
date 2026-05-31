import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateApiKey = vi.fn();
const assertSufficientBalance = vi.fn();
const executeEmbedding = vi.fn();
const createRequestLog = vi.fn();
const enforceRequestProtection = vi.fn();
const assertChatEntitlement = vi.fn();
const assertEstimatedEmbeddingRequestBudget = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  authenticateApiKey
}));

vi.mock("@/lib/balance/service", () => ({
  assertSufficientBalance
}));

vi.mock("@/lib/embeddings/service", () => ({
  executeEmbedding
}));

vi.mock("@/lib/billing/preflight", () => ({
  assertEstimatedEmbeddingRequestBudget
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

describe("embeddings route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateApiKey.mockResolvedValue({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    assertSufficientBalance.mockResolvedValue(undefined);
    assertEstimatedEmbeddingRequestBudget.mockResolvedValue(undefined);
    assertChatEntitlement.mockResolvedValue({ plan: "BUILDER" });
    enforceRequestProtection.mockResolvedValue({ release: vi.fn() });
    executeEmbedding.mockResolvedValue({
      object: "list",
      data: [],
      model: "text-embedding-3-small",
      usage: { prompt_tokens: 1, total_tokens: 1 }
    });
  });

  it("returns a 400 response for invalid JSON instead of a 500", async () => {
    const { POST } = await import("@/app/v1/embeddings/route");

    const response = await POST(
      new Request("http://localhost/v1/embeddings", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: "{not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(executeEmbedding).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request"
      }
    });
  });
});
