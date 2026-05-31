import { BalanceTransactionType, UsageLedgerStatus } from "@prisma/client";

import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReconciliationProviderRow = {
  provider: string;
  requestCount: number;
  revenueUsdMicros: bigint;
  providerCostUsdMicros: bigint;
  grossMarginUsdMicros: bigint;
};

export type ReconciliationSummary = {
  usageRevenueUsdMicros: bigint;
  topUpCreditsUsdMicros: bigint;
  manualAdjustmentsUsdMicros: bigint;
  providerCostUsdMicros: bigint;
  grossMarginUsdMicros: bigint;
  pendingUsageCount: number;
  unbillableUsageCount: number;
  failedUsageCount: number;
  currentOutstandingBalanceUsdMicros: bigint;
};

export type PaymentOperationsSummary = {
  createdCount: number;
  checkoutCreatedCount: number;
  completedCount: number;
  creditedCount: number;
  canceledCount: number;
  failedCount: number;
};

export function buildReconciliationSummary(input: {
  usageRevenueUsdMicros?: bigint | null;
  topUpCreditsUsdMicros?: bigint | null;
  manualAdjustmentsUsdMicros?: bigint | null;
  providerCostUsdMicros?: bigint | null;
  pendingUsageCount?: number;
  unbillableUsageCount?: number;
  failedUsageCount?: number;
  currentOutstandingBalanceUsdMicros?: bigint | null;
}): ReconciliationSummary {
  const usageRevenueUsdMicros = input.usageRevenueUsdMicros ?? 0n;
  const providerCostUsdMicros = input.providerCostUsdMicros ?? 0n;

  return {
    usageRevenueUsdMicros,
    topUpCreditsUsdMicros: input.topUpCreditsUsdMicros ?? 0n,
    manualAdjustmentsUsdMicros: input.manualAdjustmentsUsdMicros ?? 0n,
    providerCostUsdMicros,
    grossMarginUsdMicros: usageRevenueUsdMicros - providerCostUsdMicros,
    pendingUsageCount: input.pendingUsageCount ?? 0,
    unbillableUsageCount: input.unbillableUsageCount ?? 0,
    failedUsageCount: input.failedUsageCount ?? 0,
    currentOutstandingBalanceUsdMicros: input.currentOutstandingBalanceUsdMicros ?? 0n
  };
}

export async function getAdminReconciliationData(windowDays = 30) {
  const createdAtGte = new Date(Date.now() - windowDays * DAY_MS);

  const [usageRevenue, topUpCredits, manualAdjustments, usageRows, pendingUsageCount, unbillableUsageCount, failedUsageCount, outstandingBalance] = await Promise.all([
    db.balanceTransaction.aggregate({
      where: {
        type: BalanceTransactionType.DEBIT,
        createdAt: { gte: createdAtGte }
      },
      _sum: { amountUsdMicros: true }
    }),
    db.balanceTransaction.aggregate({
      where: {
        type: BalanceTransactionType.CREDIT,
        createdAt: { gte: createdAtGte }
      },
      _sum: { amountUsdMicros: true }
    }),
    db.balanceTransaction.aggregate({
      where: {
        type: BalanceTransactionType.ADJUSTMENT,
        createdAt: { gte: createdAtGte }
      },
      _sum: { amountUsdMicros: true }
    }),
    db.usageLedgerEntry.findMany({
      where: {
        status: UsageLedgerStatus.FINALIZED,
        chargedAt: { gte: createdAtGte }
      },
      include: {
        balanceTransaction: true
      }
    }),
    db.usageLedgerEntry.count({
      where: {
        status: UsageLedgerStatus.PENDING,
        createdAt: { gte: createdAtGte }
      }
    }),
    db.usageLedgerEntry.count({
      where: {
        status: UsageLedgerStatus.UNBILLABLE,
        createdAt: { gte: createdAtGte }
      }
    }),
    db.usageLedgerEntry.count({
      where: {
        status: UsageLedgerStatus.FAILED,
        createdAt: { gte: createdAtGte }
      }
    }),
    db.userBalance.aggregate({
      _sum: { balanceUsdMicros: true }
    })
  ]);

  const providerMap = new Map<string, ReconciliationProviderRow>();
  let providerCostUsdMicros = 0n;

  for (const row of usageRows) {
    const key = row.provider;
    const revenue = row.balanceTransaction?.amountUsdMicros ?? 0n;
    const cost = row.totalCostUsdMicros ?? 0n;
    providerCostUsdMicros += cost;

    const current = providerMap.get(key) ?? {
      provider: key,
      requestCount: 0,
      revenueUsdMicros: 0n,
      providerCostUsdMicros: 0n,
      grossMarginUsdMicros: 0n
    };

    current.requestCount += 1;
    current.revenueUsdMicros += revenue;
    current.providerCostUsdMicros += cost;
    current.grossMarginUsdMicros = current.revenueUsdMicros - current.providerCostUsdMicros;
    providerMap.set(key, current);
  }

  return {
    windowDays,
    summary: buildReconciliationSummary({
      usageRevenueUsdMicros: usageRevenue._sum.amountUsdMicros,
      topUpCreditsUsdMicros: topUpCredits._sum.amountUsdMicros,
      manualAdjustmentsUsdMicros: manualAdjustments._sum.amountUsdMicros,
      providerCostUsdMicros,
      pendingUsageCount,
      unbillableUsageCount,
      failedUsageCount,
      currentOutstandingBalanceUsdMicros: outstandingBalance._sum.balanceUsdMicros
    }),
    providerRows: [...providerMap.values()].sort((a, b) => Number(b.revenueUsdMicros - a.revenueUsdMicros))
  };
}

export function buildPaymentOperationsSummary(input: {
  createdCount?: number;
  checkoutCreatedCount?: number;
  completedCount?: number;
  creditedCount?: number;
  canceledCount?: number;
  failedCount?: number;
}): PaymentOperationsSummary {
  return {
    createdCount: input.createdCount ?? 0,
    checkoutCreatedCount: input.checkoutCreatedCount ?? 0,
    completedCount: input.completedCount ?? 0,
    creditedCount: input.creditedCount ?? 0,
    canceledCount: input.canceledCount ?? 0,
    failedCount: input.failedCount ?? 0
  };
}
