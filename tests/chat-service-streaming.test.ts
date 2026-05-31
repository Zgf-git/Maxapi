import { beforeEach, describe, expect, it, vi } from "vitest";

const streamChatCompletion = vi.fn();
const createRequestLog = vi.fn();
const updateRequestLog = vi.fn();
const finalizeUsageCharge = vi.fn();
const markUsageLedgerState = vi.fn();
const markApiKeyAuthenticatedUsage = vi.fn();

vi.mock("@/lib/providers/registry", () => ({
  getChatProvider: vi.fn(() => ({
    createChatCompletion: vi.fn(),
    streamChatCompletion
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

describe("chat service streaming billing behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not charge when streaming completes without final usage", async () => {
    const encoder = new TextEncoder();
    const upstreamStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n')
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    streamChatCompletion.mockResolvedValueOnce({
      stream: upstreamStream,
      upstreamModel: "gpt-4o-mini",
      status: 200
    });
    createRequestLog.mockResolvedValueOnce({ id: "log-1" });

    const { executeChatCompletion } = await import("@/lib/chat/service");

    const result = await executeChatCompletion(
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
        stream: true
      },
      {
        apiKeyId: "key-1",
        userId: "user-1"
      }
    );

    expect(result.kind).toBe("stream");
    if (result.kind !== "stream") {
      throw new Error("Expected streaming result");
    }

    const reader = result.body.getReader();

    while (true) {
      const { done } = await reader.read();

      if (done) {
        break;
      }
    }

    expect(finalizeUsageCharge).not.toHaveBeenCalled();
    expect(markUsageLedgerState).toHaveBeenCalledWith(
      expect.objectContaining({
        requestLogId: "log-1",
        status: "PENDING"
      })
    );
  });
});
