import { describe, expect, it } from "vitest";

import { buildPaymentOperationsSummary, buildReconciliationSummary } from "@/lib/admin/reconciliation";

describe("reconciliation summary", () => {
  it("computes gross margin and defaults empty values to zero", () => {
    expect(
      buildReconciliationSummary({
        usageRevenueUsdMicros: 5_000_000n,
        providerCostUsdMicros: 3_000_000n,
        manualAdjustmentsUsdMicros: -500_000n,
        pendingUsageCount: 2
      })
    ).toEqual({
      usageRevenueUsdMicros: 5_000_000n,
      topUpCreditsUsdMicros: 0n,
      manualAdjustmentsUsdMicros: -500_000n,
      providerCostUsdMicros: 3_000_000n,
      grossMarginUsdMicros: 2_000_000n,
      pendingUsageCount: 2,
      unbillableUsageCount: 0,
      failedUsageCount: 0,
      currentOutstandingBalanceUsdMicros: 0n
    });
  });

  it("builds payment operations totals with zero defaults", () => {
    expect(
      buildPaymentOperationsSummary({
        creditedCount: 3,
        failedCount: 1
      })
    ).toEqual({
      createdCount: 0,
      checkoutCreatedCount: 0,
      completedCount: 0,
      creditedCount: 3,
      canceledCount: 0,
      failedCount: 1
    });
  });
});
