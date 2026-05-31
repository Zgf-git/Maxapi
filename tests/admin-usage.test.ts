import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const requestLogUpdate = vi.fn();
const createAuditLog = vi.fn();
const finalizeUsageCharge = vi.fn();
const markUsageLedgerState = vi.fn();
const transactionCreate = vi.fn();
const userBalanceUpdate = vi.fn();
const transactionWrapper = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({
    usageLedgerEntry: {
      update: findUnique
    },
    userBalance: {
      update: userBalanceUpdate
    },
    balanceTransaction: {
      create: transactionCreate
    }
  })
);

vi.mock("@/lib/db", () => ({
  db: {
    usageLedgerEntry: {
      findUnique,
      findMany: vi.fn().mockResolvedValue([])
    },
    requestLog: {
      update: requestLogUpdate
    },
    $transaction: transactionWrapper
  }
}));

vi.mock("@/lib/audit/service", () => ({
  createAuditLog
}));

vi.mock("@/lib/billing/ledger", () => ({
  finalizeUsageCharge,
  markUsageLedgerState
}));

vi.mock("@/lib/balance/service", () => ({
  getOrCreateUserBalance: vi.fn(async () => ({
    userId: "user_3",
    balanceUsdMicros: 1_000_000n
  }))
}));

describe("admin usage resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finalizes a pending usage ledger with manual token input", async () => {
    findUnique.mockResolvedValueOnce({
      id: "ledger_1",
      status: "PENDING",
      requestLogId: "req_1",
      userId: "user_1",
      apiKeyId: "key_1",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: true,
      requestLog: null
    });

    const { finalizePendingUsageEntry } = await import("@/lib/admin/usage");
    const result = await finalizePendingUsageEntry({
      actorUserId: "admin_1",
      ledgerId: "ledger_1",
      promptTokens: 10,
      completionTokens: 5
    });

    expect(result).toEqual({ ok: true });
    expect(finalizeUsageCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        requestLogId: "req_1",
        usage: expect.objectContaining({
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        })
      })
    );
    expect(createAuditLog).toHaveBeenCalled();
  });

  it("marks a pending usage ledger as unbillable", async () => {
    findUnique.mockResolvedValueOnce({
      id: "ledger_2",
      status: "PENDING",
      requestLogId: "req_2",
      userId: "user_2",
      apiKeyId: "key_2",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: true,
      requestLog: null
    });

    const { resolvePendingUsageEntry } = await import("@/lib/admin/usage");
    const result = await resolvePendingUsageEntry({
      actorUserId: "admin_1",
      ledgerId: "ledger_2",
      status: "UNBILLABLE",
      notes: "Missing upstream usage"
    });

    expect(result).toEqual({ ok: true });
    expect(markUsageLedgerState).toHaveBeenCalledWith(
      expect.objectContaining({
        requestLogId: "req_2",
        status: "UNBILLABLE",
        notes: "Missing upstream usage"
      })
    );
    expect(requestLogUpdate).not.toHaveBeenCalled();
  });

  it("recalculates a finalized usage ledger and writes an adjustment delta", async () => {
    findUnique.mockResolvedValueOnce({
      id: "ledger_3",
      status: "FINALIZED",
      requestLogId: "req_3",
      userId: "user_3",
      apiKeyId: "key_3",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: false,
      promptTokens: 1_000,
      completionTokens: 500,
      totalTokens: 1_500,
      promptCacheHitTokens: null,
      promptCacheMissTokens: null,
      reasoningTokens: null,
      totalCostUsdMicros: 999n,
      notes: null,
      balanceTransaction: {
        id: "txn_3"
      }
    });

    const { recalculateFinalizedUsageEntry } = await import("@/lib/admin/usage");
    const result = await recalculateFinalizedUsageEntry({
      actorUserId: "admin_1",
      ledgerId: "ledger_3"
    });

    expect(result).toEqual({ ok: true });
    expect(userBalanceUpdate).toHaveBeenCalled();
    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "usage_recalc:ledger_3"
        })
      })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.usage.recalculate_finalized"
      })
    );
  });
});
