import { RequestLogStatus, UsageLedgerStatus } from "@prisma/client";

import { db } from "@/lib/db";
import {
  buildOpsDashboardData,
  buildOpsSummary,
  getOpsDashboardData
} from "@/lib/ops/service";
import type { OpsFilters } from "@/lib/ops/types";

export { getOpsDashboardData, buildOpsSummary };
export type { OpsFilters } from "@/lib/ops/types";

/* ── Time-series for charts ────────────────────────────────────── */

export type TimeSeriesPoint = {
  label: string;
  requests: number;
  errors: number;
  errorRate: number;
  p50Latency: number | null;
  p95Latency: number | null;
};

export async function getRequestTimeSeries(
  filters: OpsFilters
): Promise<TimeSeriesPoint[]> {
  const days = filters.window === "24h" ? 1 : filters.window === "7d" ? 7 : 30;
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where = {
    createdAt: { gte: windowStart },
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.routePolicy
      ? {
          routePolicy:
            filters.routePolicy === "explicit" ? null : filters.routePolicy
        }
      : {}),
    ...(filters.fallbackUsed
      ? { fallbackUsed: filters.fallbackUsed === "true" }
      : {})
  };

  const logs = await db.requestLog.findMany({
    where,
    select: {
      createdAt: true,
      status: true,
      latencyMs: true
    },
    orderBy: { createdAt: "asc" }
  });

  // Bucket size: hour for 24h, day for 7d/30d
  const bucketHourly = days <= 1;

  const buckets = new Map<
    string,
    { latencies: number[]; requests: number; errors: number }
  >();

  for (const log of logs) {
    const date = bucketHourly
      ? `${log.createdAt.toISOString().slice(0, 13)}:00`
      : log.createdAt.toISOString().slice(0, 10);

    const entry = buckets.get(date) ?? {
      latencies: [],
      requests: 0,
      errors: 0
    };
    entry.requests += 1;
    if (log.status === RequestLogStatus.ERROR) entry.errors += 1;
    if (log.latencyMs !== null) entry.latencies.push(log.latencyMs);
    buckets.set(date, entry);
  }

  // Fill empty buckets
  const result: TimeSeriesPoint[] = [];
  const totalBuckets = bucketHourly ? 24 : days;
  for (let i = 0; i < totalBuckets; i += 1) {
    const d = new Date(windowStart);
    if (bucketHourly) {
      d.setHours(d.getHours() + i);
    } else {
      d.setDate(d.getDate() + i);
    }
    const label = bucketHourly
      ? `${String(d.getHours()).padStart(2, "0")}:00`
      : d.toISOString().slice(5, 10);
    const key = bucketHourly
      ? d.toISOString().slice(0, 13) + ":00"
      : d.toISOString().slice(0, 10);

    const entry = buckets.get(key) ?? {
      latencies: [],
      requests: 0,
      errors: 0
    };

    const sorted = entry.latencies.sort((a, b) => a - b);
    const p50 =
      sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.5)] ?? sorted[0]
        : null;
    const p95 =
      sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1]
        : null;

    result.push({
      label,
      requests: entry.requests,
      errors: entry.errors,
      errorRate:
        entry.requests > 0 ? Math.round((entry.errors / entry.requests) * 10000) / 10000 : 0,
      p50Latency: p50,
      p95Latency: p95
    });
  }

  return result;
}

/* ── Pending usage ─────────────────────────────────────────────── */

export async function listPendingUsage(page: number) {
  const PAGE_SIZE = 20;
  const [items, total] = await Promise.all([
    db.usageLedgerEntry.findMany({
      where: { status: UsageLedgerStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        requestLog: {
          select: {
            userId: true,
            provider: true,
            requestedModel: true,
            totalTokens: true
          }
        }
      }
    }),
    db.usageLedgerEntry.count({ where: { status: UsageLedgerStatus.PENDING } })
  ]);

  return {
    items: items.map((e) => ({
      id: e.id,
      userId: e.requestLog?.userId ?? null,
      provider: e.requestLog?.provider ?? null,
      model: e.requestLog?.requestedModel ?? null,
      tokens: e.requestLog?.totalTokens ?? null,
      totalCostUsdMicros: e.totalCostUsdMicros,
      status: e.status,
      createdAt: e.createdAt
    })),
    total,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}

/* ── Failures ──────────────────────────────────────────────────── */

export async function listRecentFailures(page: number) {
  const PAGE_SIZE = 20;
  const [items, total] = await Promise.all([
    db.requestLog.findMany({
      where: { status: RequestLogStatus.ERROR },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        userId: true,
        provider: true,
        requestedModel: true,
        upstreamModel: true,
        status: true,
        httpStatus: true,
        errorCode: true,
        errorMessage: true,
        latencyMs: true,
        createdAt: true
      }
    }),
    db.requestLog.count({ where: { status: RequestLogStatus.ERROR } })
  ]);

  return { items, total, pageCount: Math.ceil(total / PAGE_SIZE) };
}

/* ── Abuse events ──────────────────────────────────────────────── */

export async function listAbuseEvents(page: number) {
  const PAGE_SIZE = 20;
  const [items, total] = await Promise.all([
    db.abuseEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        user: { select: { email: true } }
      }
    }),
    db.abuseEvent.count()
  ]);

  return {
    items: items.map((e) => ({
      id: e.id,
      userEmail: e.user?.email ?? null,
      eventType: e.eventType,
      severity: e.severity,
      status: e.status,
      reasonCode: e.reasonCode,
      routePolicy: e.routePolicy,
      requestedModel: e.requestedModel,
      createdAt: e.createdAt
    })),
    total,
    pageCount: Math.ceil(total / PAGE_SIZE)
  };
}
