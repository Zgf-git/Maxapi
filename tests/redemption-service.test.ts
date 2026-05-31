import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  codes: new Map<string, any>(),
  redemptions: [] as any[],
  balances: new Map<string, any>(),
  transactions: [] as any[]
};

const dbLike = {
  redemptionCode: {
    create: vi.fn(async ({ data }: any) => {
      const row = {
        id: `code_${state.codes.size + 1}`,
        status: "ACTIVE",
        redeemedCount: 0,
        ...data
      };
      state.codes.set(row.codeHash, row);
      return row;
    }),
    findUnique: vi.fn(async ({ where }: any) => state.codes.get(where.codeHash) ?? null),
    update: vi.fn(async ({ where, data }: any) => {
      const row = [...state.codes.values()].find((code) => code.id === where.id);
      Object.assign(row, {
        ...data,
        redeemedCount:
          typeof data.redeemedCount === "object"
            ? row.redeemedCount + data.redeemedCount.increment
            : data.redeemedCount ?? row.redeemedCount
      });
      return row;
    })
  },
  redemptionCodeRedemption: {
    findFirst: vi.fn(async ({ where }: any) =>
      state.redemptions.find(
        (redemption) =>
          redemption.redemptionCodeId === where.redemptionCodeId &&
          redemption.userId === where.userId
      ) ?? null
    ),
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `redemption_${state.redemptions.length + 1}`, ...data };
      state.redemptions.push(row);
      return row;
    })
  },
  userBalance: {
    findUnique: vi.fn(async ({ where }: any) => state.balances.get(where.userId) ?? null),
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `balance_${state.balances.size + 1}`, ...data };
      state.balances.set(data.userId, row);
      return row;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const row = state.balances.get(where.userId);
      const updated = { ...row, ...data };
      state.balances.set(where.userId, updated);
      return updated;
    })
  },
  balanceTransaction: {
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `txn_${state.transactions.length + 1}`, ...data };
      state.transactions.push(row);
      return row;
    })
  },
  $transaction: vi.fn(async (callback: (tx: typeof dbLike) => Promise<unknown>) => callback(dbLike))
};

vi.mock("@/lib/db", () => ({
  db: dbLike
}));

describe("redemption service", () => {
  beforeEach(() => {
    state.codes.clear();
    state.redemptions = [];
    state.balances.clear();
    state.transactions = [];
    vi.clearAllMocks();
  });

  it("creates a hashed code and redeems it once into user balance", async () => {
    const { createRedemptionCode, redeemCode } = await import("@/lib/redemption/service");
    const created = await createRedemptionCode({
      label: "Launch credit",
      creditAmountUsdMicros: 5_000_000n,
      maxRedemptions: 1
    });

    expect(created.plaintextCode).toMatch(/^MAX-/);
    expect([...state.codes.values()][0].codeHash).not.toContain(created.plaintextCode);

    const result = await redeemCode({
      userId: "user_1",
      code: created.plaintextCode
    });

    expect(result).toMatchObject({
      ok: true,
      amountUsdMicros: 5_000_000n,
      balanceAfterUsdMicros: 5_000_000n
    });
    expect(state.transactions[0]).toMatchObject({
      type: "CREDIT",
      amountUsdMicros: 5_000_000n,
      reason: expect.stringContaining("redemption_code:")
    });
    expect([...state.codes.values()][0].status).toBe("EXHAUSTED");

    await expect(
      redeemCode({
        userId: "user_1",
        code: created.plaintextCode
      })
    ).resolves.toMatchObject({
      ok: false
    });
  });
});
