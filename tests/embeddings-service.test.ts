import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("embeddings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps unsupported embedding provider capability to an API route error", async () => {
    getProviderForCapability.mockRejectedValueOnce(new Error("Provider does not support embeddings: apimart"));

    const { executeEmbedding } = await import("@/lib/embeddings/service");

    await expect(
      executeEmbedding(
        {
          model: "deepseek-v3.1",
          input: "hello"
        },
        {
          apiKeyId: "key_1",
          userId: "user_1"
        }
      )
    ).rejects.toMatchObject({
      status: 400,
      code: "unsupported_model"
    });

    expect(createRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "apimart",
        requestType: "EMBEDDING",
        status: "ERROR"
      })
    );
  });
});
