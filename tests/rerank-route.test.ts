import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateApiKey = vi.fn();
const assertSufficientBalance = vi.fn();
const assertEstimatedRerankRequestBudget = vi.fn();
const executeRerank = vi.fn();
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
  assertEstimatedRerankRequestBudget
}));

vi.mock("@/lib/rerank/service", () => ({
  executeRerank
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

describe("rerank route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateApiKey.mockResolvedValue({
      ok: true,
      apiKeyId: "key-1",
      userId: "user-1",
      keyName: "Test key"
    });
    assertSufficientBalance.mockResolvedValue(undefined);
    assertEstimatedRerankRequestBudget.mockResolvedValue(undefined);
    assertChatEntitlement.mockResolvedValue({ plan: "PRO" });
    enforceRequestProtection.mockResolvedValue({ release: vi.fn() });
    executeRerank.mockResolvedValue({
      model: "bge-reranker-v2-m3",
      results: [{ index: 0, relevance_score: 0.9 }],
      usage: { total_tokens: 12 }
    });
  });

  it("executes a valid rerank request", async () => {
    const { POST } = await import("@/app/v1/rerank/route");

    const response = await POST(
      new Request("http://localhost/v1/rerank", {
        method: "POST",
        headers: {
          authorization: "Bearer mk_live_key",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "bge-reranker-v2-m3",
          query: "best ai api gateway",
          documents: ["MaxAPI routes traffic.", "A billing dashboard."],
          top_n: 1
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      results: [{ index: 0, relevance_score: 0.9 }]
    });
    expect(assertEstimatedRerankRequestBudget).toHaveBeenCalled();
    expect(executeRerank).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "bge-reranker-v2-m3",
        query: "best ai api gateway"
      }),
      expect.any(Object)
    );
  });
});
