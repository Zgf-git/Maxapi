import { beforeEach, describe, expect, it, vi } from "vitest";

const createAuditLog = vi.fn();
const userBalanceFindUnique = vi.fn();
const userBalanceCreate = vi.fn();
const userBalanceUpdate = vi.fn();
const billingResolutionCreate = vi.fn();
const billingResolutionUpdate = vi.fn();
const balanceTransactionCreate = vi.fn();
const dbTransaction = vi.fn(async (callback: any) =>
  callback({
    userBalance: {
      findUnique: userBalanceFindUnique,
      create: userBalanceCreate,
      update: userBalanceUpdate
    },
    billingResolution: {
      create: billingResolutionCreate,
      update: billingResolutionUpdate
    },
    balanceTransaction: {
      create: balanceTransactionCreate
    }
  })
);

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: dbTransaction
  }
}));

vi.mock("@/lib/audit/service", () => ({
  createAuditLog
}));

describe("billing resolutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userBalanceFindUnique.mockResolvedValue({
      id: "bal_1",
      userId: "user_1",
      balanceUsdMicros: 5_000_000n
    });
    userBalanceUpdate.mockResolvedValue({});
    billingResolutionCreate.mockResolvedValue({
      id: "res_1"
    });
    balanceTransactionCreate.mockResolvedValue({
      id: "txn_1"
    });
    billingResolutionUpdate.mockResolvedValue({
      id: "res_1",
      type: "REFUND",
      status: "APPLIED",
      amountUsdMicros: -2_000_000n
    });
  });

  it("creates and applies a refund resolution as a negative adjustment", async () => {
    const { createBillingResolution } = await import("@/lib/admin/resolutions");
    const result = await createBillingResolution({
      actorUserId: "admin_1",
      targetUserId: "user_1",
      type: "REFUND",
      amountUsdMicros: -2_000_000n,
      reason: "Customer refund",
      operatorNotes: "Resolved duplicate charge claim"
    });

    expect(result).toEqual({
      ok: true,
      resolution: expect.objectContaining({
        id: "res_1",
        status: "APPLIED"
      })
    });
    expect(balanceTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountUsdMicros: -2_000_000n,
          billingResolutionId: "res_1"
        })
      })
    );
    expect(createAuditLog).toHaveBeenCalled();
  });
});
