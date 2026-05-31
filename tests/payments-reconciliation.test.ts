import { beforeEach, describe, expect, it, vi } from "vitest";

const topUpPurchaseFindMany = vi.fn();
const topUpPurchaseFindUnique = vi.fn();
const topUpPurchaseUpdateMany = vi.fn();
const createAuditLog = vi.fn();
const creditTopUpPurchase = vi.fn();
const capturePayPalOrderWithConfig = vi.fn();
const getActivePayPalRuntime = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    topUpPurchase: {
      findMany: topUpPurchaseFindMany,
      findUnique: topUpPurchaseFindUnique,
      updateMany: topUpPurchaseUpdateMany
    }
  }
}));

vi.mock("@/lib/audit/service", () => ({
  createAuditLog
}));

vi.mock("@/lib/payments/common", () => ({
  creditTopUpPurchase
}));

vi.mock("@/lib/payments/paypal", () => ({
  capturePayPalOrderWithConfig
}));

vi.mock("@/lib/payments/provider-instances", () => ({
  getActivePayPalRuntime
}));

describe("payment reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    topUpPurchaseFindUnique.mockResolvedValue(null);
    creditTopUpPurchase.mockResolvedValue({ ok: true, credited: false });
    getActivePayPalRuntime.mockResolvedValue({
      provider: "PAYPAL",
      source: "env",
      instanceId: null,
      label: "Environment PayPal",
      config: {
        clientId: "paypal-client",
        clientSecret: "paypal-secret"
      }
    });
  });

  it("cancels stale created and checkout-created purchases", async () => {
    topUpPurchaseFindMany.mockResolvedValue([{ id: "purchase_1" }, { id: "purchase_2" }]);
    topUpPurchaseUpdateMany.mockResolvedValue({ count: 2 });

    const { sweepStaleTopUpPurchases } = await import("@/lib/payments/reconciliation");
    const result = await sweepStaleTopUpPurchases("admin_1");

    expect(result).toEqual({ ok: true, canceledCount: 2, creditedCount: 0 });
    expect(topUpPurchaseUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CANCELED",
          notes: "checkout_expired_by_sweep"
        })
      })
    );
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin_1",
        action: "payment.topup.sweep"
      })
    );
  });

  it("credits stale PayPal purchases that can be captured during reconciliation", async () => {
    topUpPurchaseFindMany.mockResolvedValue([{ id: "purchase_paypal" }, { id: "purchase_other" }]);
    topUpPurchaseFindUnique.mockResolvedValueOnce({
      id: "purchase_paypal",
      paymentProvider: "PAYPAL",
      providerOrderId: "order_1",
      status: "CHECKOUT_CREATED"
    });
    capturePayPalOrderWithConfig.mockResolvedValueOnce({
      response: { ok: true },
      payload: {
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [{ id: "capture_1" }]
            }
          }
        ]
      }
    });
    creditTopUpPurchase.mockResolvedValueOnce({ ok: true, credited: true });
    topUpPurchaseUpdateMany.mockResolvedValue({ count: 1 });

    const { sweepStaleTopUpPurchases } = await import("@/lib/payments/reconciliation");
    const result = await sweepStaleTopUpPurchases("admin_1");

    expect(result).toEqual({ ok: true, canceledCount: 1, creditedCount: 1 });
    expect(creditTopUpPurchase).toHaveBeenCalledWith({
      purchaseId: "purchase_paypal",
      providerPaymentId: "capture_1",
      notes: "paypal_reconciled_capture"
    });
  });
});
