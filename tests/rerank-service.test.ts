import { beforeEach, describe, expect, it, vi } from "vitest";

const createRerank = vi.fn();
const getProviderForCapability = vi.fn();
const createRequestLog = vi.fn();
const finalizeUsageCharge = vi.fn();
const markUsageLedgerState = vi.fn();
const markApiKeyAuthenticatedUsage = vi.fn();

vi.mock("@/lib/providers/registry", () => ({
  getProviderForCapability
}));

vi.mock("@/lib/request-logs/repository", () => ({
  createRequestLog
}));

vi.mock("@/lib/billing/ledger", () => ({
  finalizeUsageCharge,
  markUsageLedgerState
}));

vi.mock("@/lib/api-auth", () => ({
  markApiKeyAuthenticatedUsage
}));

describe("rerank service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProviderForCapability.mockResolvedValue({ createRerank });
    createRequestLog.mockResolvedValue({ id: "log-1" });
    createRerank.mockResolvedValue({
      model: "bge-reranker-v2-m3",
      results: [{ index: 1, relevance_score: 0.8 }],
      usage: { total_tokens: 20 }
    });
  });

  it("logs and bills successful rerank usage", async () => {
    const { executeRerank } = await import("@/lib/rerank/service");

    const result = await executeRerank(
      {
        model: "bge-reranker-v2-m3",
        query: "hello",
        documents: ["alpha", "beta"]
      },
      {
        apiKeyId: "key-1",
        userId: "user-1"
      }
    );

    expect(result.results[0].index).toBe(1);
    expect(getProviderForCapability).toHaveBeenCalledWith("apimart", "rerank");
    expect(createRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: "RERANK",
        status: "SUCCESS",
        totalTokens: 20
      })
    );
    expect(finalizeUsageCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "apimart",
        upstreamModel: "bge-reranker-v2-m3",
        usage: expect.objectContaining({
          promptTokens: 20,
          totalTokens: 20
        })
      })
    );
    expect(markApiKeyAuthenticatedUsage).toHaveBeenCalledWith("key-1");
  });
});
