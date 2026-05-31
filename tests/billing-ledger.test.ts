import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

type UserBalanceRow = {
  id: string;
  userId: string;
  balanceUsdMicros: bigint;
};

type UsageLedgerRow = {
  id: string;
  userId: string;
  apiKeyId: string;
  requestLogId: string | null;
  provider: string;
  requestedModel: string | null;
  upstreamModel: string | null;
  pricingVersion: string;
  pricingSnapshot: Record<string, unknown> | null;
  usageSnapshot: Record<string, unknown> | null;
  status: "PENDING" | "FINALIZED" | "UNBILLABLE" | "FAILED";
  isStream: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  promptCacheHitTokens: number | null;
  promptCacheMissTokens: number | null;
  reasoningTokens: number | null;
  inputCostUsdMicros: bigint | null;
  outputCostUsdMicros: bigint | null;
  totalCostUsdMicros: bigint | null;
  chargedAt: Date | null;
  createdAt: Date;
  finalizedAt: Date | null;
  notes: string | null;
  errorReason: string | null;
};

type BalanceTransactionRow = {
  id: string;
  userId: string;
  type: "CREDIT" | "DEBIT" | "ADJUSTMENT";
  amountUsdMicros: bigint;
  balanceBeforeUsdMicros: bigint;
  balanceAfterUsdMicros: bigint;
  usageLedgerId: string | null;
  reason: string;
  createdAt: Date;
};

function createMockDb() {
  const state = {
    userBalances: new Map<string, UserBalanceRow>(),
    usageLedgers: new Map<string, UsageLedgerRow>(),
    balanceTransactions: new Map<string, BalanceTransactionRow>()
  };

  let ledgerCounter = 1;
  let balanceCounter = 1;
  let transactionCounter = 1;
  let createBarrier:
    | {
        arrivals: number;
        promise: Promise<void>;
        release: () => void;
      }
    | null = null;

  function createUniqueConstraintError(target: string) {
    return new Prisma.PrismaClientKnownRequestError(
      `Unique constraint failed on ${target}.`,
      {
        code: "P2002",
        clientVersion: "test",
        meta: {
          target: [target]
        }
      }
    );
  }

  const dbLike = {
    userBalance: {
      findUnique: vi.fn(async ({ where }: { where: { userId: string } }) => {
        return state.userBalances.get(where.userId) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: { userId: string; balanceUsdMicros: bigint } }) => {
        const row: UserBalanceRow = {
          id: `bal-${balanceCounter++}`,
          userId: data.userId,
          balanceUsdMicros: data.balanceUsdMicros
        };
        state.userBalances.set(data.userId, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { userId: string }; data: { balanceUsdMicros: bigint } }) => {
        const existing = state.userBalances.get(where.userId);

        if (!existing) {
          throw new Error("Balance missing");
        }

        const updated = {
          ...existing,
          balanceUsdMicros: data.balanceUsdMicros
        };
        state.userBalances.set(where.userId, updated);
        return updated;
      })
    },
    usageLedgerEntry: {
      findUnique: vi.fn(async ({ where }: { where: { requestLogId?: string; id?: string } }) => {
        if (where.requestLogId !== undefined) {
          for (const row of state.usageLedgers.values()) {
            if (row.requestLogId === where.requestLogId) {
              const balanceTransaction = [...state.balanceTransactions.values()].find(
                (transaction) => transaction.usageLedgerId === row.id
              ) ?? null;

              return {
                ...row,
                balanceTransaction
              };
            }
          }

          return null;
        }

        if (where.id) {
          return state.usageLedgers.get(where.id) ?? null;
        }

        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<UsageLedgerRow, "id" | "createdAt"> }) => {
        if (createBarrier) {
          createBarrier.arrivals += 1;

          if (createBarrier.arrivals === 2) {
            createBarrier.release();
          }

          await createBarrier.promise;
        }

        for (const existing of state.usageLedgers.values()) {
          if (existing.requestLogId === data.requestLogId) {
            throw createUniqueConstraintError("requestLogId");
          }
        }

        const row: UsageLedgerRow = {
          ...data,
          id: `ledger-${ledgerCounter++}`,
          createdAt: new Date()
        };
        state.usageLedgers.set(row.id, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<UsageLedgerRow> }) => {
        const existing = state.usageLedgers.get(where.id);

        if (!existing) {
          throw new Error("Ledger missing");
        }

        const updated = {
          ...existing,
          ...data
        };
        state.usageLedgers.set(where.id, updated);
        return updated;
      })
    },
    balanceTransaction: {
      findUnique: vi.fn(async ({ where }: { where: { usageLedgerId: string } }) => {
        return (
          [...state.balanceTransactions.values()].find(
            (transaction) => transaction.usageLedgerId === where.usageLedgerId
          ) ?? null
        );
      }),
      create: vi.fn(async ({ data }: { data: Omit<BalanceTransactionRow, "id" | "createdAt"> }) => {
        if (data.usageLedgerId) {
          for (const existing of state.balanceTransactions.values()) {
            if (existing.usageLedgerId === data.usageLedgerId) {
              throw createUniqueConstraintError("usageLedgerId");
            }
          }
        }

        const row: BalanceTransactionRow = {
          ...data,
          id: `txn-${transactionCounter++}`,
          createdAt: new Date()
        };
        state.balanceTransactions.set(row.id, row);
        return row;
      })
    },
    $transaction: vi.fn(async (callback: (tx: typeof dbLike) => Promise<unknown>) => callback(dbLike))
  };

  return {
    state,
    dbLike,
    setConcurrentLedgerCreateBarrier() {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });

      createBarrier = {
        arrivals: 0,
        promise,
        release
      };
    },
    clearConcurrentLedgerCreateBarrier() {
      createBarrier = null;
    }
  };
}

const { state, dbLike, setConcurrentLedgerCreateBarrier, clearConcurrentLedgerCreateBarrier } = createMockDb();

vi.mock("@/lib/db", () => ({
  db: dbLike
}));

describe("billing ledger finalization", () => {
  beforeEach(() => {
    state.userBalances.clear();
    state.usageLedgers.clear();
    state.balanceTransactions.clear();
    clearConcurrentLedgerCreateBarrier();

    state.userBalances.set("user-1", {
      id: "bal-1",
      userId: "user-1",
      balanceUsdMicros: 5_000_000n
    });

    vi.clearAllMocks();
  });

  it("creates a finalized ledger entry, debit transaction, and decremented balance", async () => {
    const { finalizeUsageCharge } = await import("@/lib/billing/ledger");

    await finalizeUsageCharge({
      userId: "user-1",
      apiKeyId: "key-1",
      requestLogId: "log-1",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: false,
      usage: {
        promptTokens: 1_000,
        completionTokens: 500,
        totalTokens: 1_500,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      }
    });

    const ledger = [...state.usageLedgers.values()][0];
    const transaction = [...state.balanceTransactions.values()][0];
    const balance = state.userBalances.get("user-1");

    expect(ledger.status).toBe("FINALIZED");
    expect(ledger.totalCostUsdMicros).toBe(450n);
    expect(ledger.pricingSnapshot).toMatchObject({
      provider: "openai",
      model: "gpt-4o-mini"
    });
    expect(ledger.usageSnapshot).toMatchObject({
      promptTokens: 1_000,
      completionTokens: 500
    });
    expect(transaction.amountUsdMicros).toBe(450n);
    expect(balance?.balanceUsdMicros).toBe(4_999_550n);
  });

  it("does not double-charge when finalization runs twice for the same request log", async () => {
    const { finalizeUsageCharge } = await import("@/lib/billing/ledger");

    const input = {
      userId: "user-1",
      apiKeyId: "key-1",
      requestLogId: "log-1",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: false,
      usage: {
        promptTokens: 1_000,
        completionTokens: 500,
        totalTokens: 1_500,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      }
    } as const;

    await finalizeUsageCharge(input);
    await finalizeUsageCharge(input);

    expect(state.usageLedgers.size).toBe(1);
    expect(state.balanceTransactions.size).toBe(1);
    expect(state.userBalances.get("user-1")?.balanceUsdMicros).toBe(4_999_550n);
  });

  it("charges the full finalized cost even when the balance is lower than the final usage", async () => {
    const { finalizeUsageCharge } = await import("@/lib/billing/ledger");

    state.userBalances.set("user-1", {
      id: "bal-1",
      userId: "user-1",
      balanceUsdMicros: 100n
    });

    await finalizeUsageCharge({
      userId: "user-1",
      apiKeyId: "key-1",
      requestLogId: "log-1",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: false,
      usage: {
        promptTokens: 1_000,
        completionTokens: 500,
        totalTokens: 1_500,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      }
    });

    const ledger = [...state.usageLedgers.values()][0];
    const transaction = [...state.balanceTransactions.values()][0];

    expect(transaction.amountUsdMicros).toBe(450n);
    expect(state.userBalances.get("user-1")?.balanceUsdMicros).toBe(-350n);
    expect(ledger.notes).toContain("Balance went negative");
  });

  it("remains idempotent when concurrent finalizations race on the same request log", async () => {
    const { finalizeUsageCharge } = await import("@/lib/billing/ledger");

    const input = {
      userId: "user-1",
      apiKeyId: "key-1",
      requestLogId: "log-1",
      provider: "openai",
      requestedModel: "gpt-4o-mini",
      upstreamModel: "gpt-4o-mini",
      isStream: false,
      usage: {
        promptTokens: 1_000,
        completionTokens: 500,
        totalTokens: 1_500,
        promptCacheHitTokens: null,
        promptCacheMissTokens: null,
        reasoningTokens: null
      }
    } as const;

    setConcurrentLedgerCreateBarrier();

    const [first, second] = await Promise.all([
      finalizeUsageCharge(input),
      finalizeUsageCharge(input)
    ]);

    expect(state.usageLedgers.size).toBe(1);
    expect(state.balanceTransactions.size).toBe(1);
    expect(state.userBalances.get("user-1")?.balanceUsdMicros).toBe(4_999_550n);
    expect(first.id).toBe(second.id);
    expect(first.requestLogId).toBe("log-1");
    expect(second.requestLogId).toBe("log-1");
  });
});
