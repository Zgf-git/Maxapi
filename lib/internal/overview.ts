import { db } from "@/lib/db";

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export type OverviewData = {
  mau: number;
  mauDelta: number;
  requests24h: number;
  requests24hDelta: number;
  revenue24hUsdMicros: bigint;
  revenue24hDelta: number;
  errorRate24h: number;
  errorRate24hDelta: number;
  pendingRefunds: number;
  unresolvedAbuse: number;
  pendingReconciliation: number;
};

function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getOverviewData(): Promise<OverviewData> {
  const now = new Date();
  const h24 = hoursAgo(24);
  const h48 = hoursAgo(48);
  const d30 = daysAgo(30);
  const d60 = daysAgo(60);

  const [
    mau,
    mauPrev,
    requests24h,
    requestsPrev24h,
    revenue24h,
    revenuePrev24h,
    errors24h,
    errorsPrev24h,
    total24h,
    totalPrev24h,
    pendingRefunds,
    unresolvedAbuse,
    pendingReconciliation
  ] = await Promise.all([
    // MAU — users with at least 1 request in last 30d
    db.user.count({
      where: { requestLogs: { some: { createdAt: { gte: d30 } } } }
    }),
    db.user.count({
      where: { requestLogs: { some: { createdAt: { gte: d60, lt: d30 } } } }
    }),
    // Requests
    db.requestLog.count({ where: { createdAt: { gte: h24 } } }),
    db.requestLog.count({ where: { createdAt: { gte: h48, lt: h24 } } }),
    // Revenue — CREDIT balance transactions (top-ups credited) in last 24h
    db.balanceTransaction.aggregate({
      where: { type: "CREDIT", createdAt: { gte: h24 } },
      _sum: { amountUsdMicros: true }
    }),
    db.balanceTransaction.aggregate({
      where: { type: "CREDIT", createdAt: { gte: h48, lt: h24 } },
      _sum: { amountUsdMicros: true }
    }),
    // Errors
    db.requestLog.count({ where: { status: "ERROR", createdAt: { gte: h24 } } }),
    db.requestLog.count({ where: { status: "ERROR", createdAt: { gte: h48, lt: h24 } } }),
    db.requestLog.count({ where: { createdAt: { gte: h24 } } }),
    db.requestLog.count({ where: { createdAt: { gte: h48, lt: h24 } } }),
    // Action queue
    db.billingResolution.count({ where: { status: "OPEN" } }),
    db.abuseEvent.count({ where: { createdAt: { gte: hoursAgo(24) } } }),
    db.topUpPurchase.count({
      where: {
        status: { in: ["COMPLETED", "CREDITED"] },
        providerEventIdLastProcessed: null
      }
    })
  ]);

  const revenue24hMicros = revenue24h._sum.amountUsdMicros ?? 0n;
  const revenuePrevMicros = revenuePrev24h._sum.amountUsdMicros ?? 0n;

  const errorRate24h = total24h > 0 ? Math.round((errors24h / total24h) * 10000) / 10000 : 0;
  const errorRatePrev24h = totalPrev24h > 0 ? Math.round((errorsPrev24h / totalPrev24h) * 10000) / 10000 : 0;

  return {
    mau,
    mauDelta: deltaPct(mau, mauPrev),
    requests24h,
    requests24hDelta: deltaPct(requests24h, requestsPrev24h),
    revenue24hUsdMicros: revenue24hMicros,
    revenue24hDelta: deltaPct(Number(revenue24hMicros), Number(revenuePrevMicros)),
    errorRate24h,
    errorRate24hDelta: deltaPct(Math.round(errorRate24h * 100), Math.round(errorRatePrev24h * 100)),
    pendingRefunds,
    unresolvedAbuse,
    pendingReconciliation
  };
}
