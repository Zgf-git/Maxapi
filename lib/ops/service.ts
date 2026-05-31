import { Prisma, RequestLogStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { estimateProviderCostUsdMicros } from "@/lib/ops/cost-basis";
import type {
  OpsBreakdownRow,
  OpsAbuseEventRow,
  OpsAbuseReasonRow,
  OpsDashboardData,
  OpsFailureRow,
  OpsFallbackRow,
  OpsFilters,
  OpsRequestMetricInput,
  OpsSummary
} from "@/lib/ops/types";

const DAY_MS = 24 * 60 * 60 * 1000;

type OpsRequestLog = Prisma.RequestLogGetPayload<{
  include: {
    usageLedgerEntry: {
      include: {
        balanceTransaction: true;
      };
    };
  };
}>;

function getWindowStart(window: OpsFilters["window"]) {
  const days = window === "24h" ? 1 : window === "7d" ? 7 : 30;

  return new Date(Date.now() - days * DAY_MS);
}

function buildOpsWhere(filters: OpsFilters): Prisma.RequestLogWhereInput {
  const where: Prisma.RequestLogWhereInput = {
    createdAt: {
      gte: getWindowStart(filters.window)
    }
  };

  if (filters.provider) {
    where.provider = filters.provider;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.routePolicy) {
    where.routePolicy = filters.routePolicy === "explicit" ? null : filters.routePolicy;
  }

  if (filters.fallbackUsed) {
    where.fallbackUsed = filters.fallbackUsed === "true";
  }

  return where;
}

function toMetricInput(row: OpsRequestLog): OpsRequestMetricInput {
  const ledger = row.usageLedgerEntry;
  const revenueUsdMicros = ledger?.balanceTransaction?.amountUsdMicros ?? 0n;

  return {
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    requestedModel: row.requestedModel,
    requestedRoutePolicy: row.routePolicy,
    actualProvider: row.provider,
    actualUpstreamModel: row.upstreamModel,
    fallbackUsed: row.fallbackUsed,
    fallbackFromProvider: row.fallbackFromProvider,
    fallbackFromModel: row.fallbackFromModel,
    status: row.status,
    latencyMs: row.latencyMs,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    revenueUsdMicros,
    providerCostUsdMicros: estimateProviderCostUsdMicros(row.provider, ledger?.totalCostUsdMicros ?? revenueUsdMicros),
    totalTokens: row.totalTokens
  };
}

function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function ratio(numerator: bigint, denominator: bigint) {
  return denominator > 0n ? Number(numerator) / Number(denominator) : null;
}

function actualPath(row: OpsRequestMetricInput) {
  return `${row.actualProvider} / ${row.actualUpstreamModel ?? "unknown"}`;
}

function requestedIntent(row: OpsRequestMetricInput) {
  return row.requestedRoutePolicy ? `policy:${row.requestedRoutePolicy}` : `model:${row.requestedModel ?? "explicit"}`;
}

function topActualPath(rows: OpsRequestMetricInput[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = actualPath(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildOpsSummary(rows: OpsRequestMetricInput[]): OpsSummary {
  const requestCount = rows.length;
  const successCount = rows.filter((row) => row.status === RequestLogStatus.SUCCESS).length;
  const fallbackCount = rows.filter((row) => row.fallbackUsed).length;
  const revenueUsdMicros = rows.reduce((total, row) => total + row.revenueUsdMicros, 0n);
  const providerCostUsdMicros = rows.reduce((total, row) => total + row.providerCostUsdMicros, 0n);
  const failuresByProvider = new Map<string, number>();

  for (const row of rows) {
    if (row.status === RequestLogStatus.ERROR) {
      failuresByProvider.set(row.actualProvider, (failuresByProvider.get(row.actualProvider) ?? 0) + 1);
    }
  }

  const worstFailureSource = [...failuresByProvider.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const grossMarginUsdMicros = revenueUsdMicros - providerCostUsdMicros;

  return {
    requestCount,
    successRate: safeRate(successCount, requestCount),
    fallbackRate: safeRate(fallbackCount, requestCount),
    revenueUsdMicros,
    providerCostUsdMicros,
    grossMarginUsdMicros,
    grossMarginRate: ratio(grossMarginUsdMicros, revenueUsdMicros),
    worstFailureSource
  };
}

function buildBreakdown(rows: OpsRequestMetricInput[], keyForRow: (row: OpsRequestMetricInput) => string): OpsBreakdownRow[] {
  const groups = new Map<string, OpsRequestMetricInput[]>();

  for (const row of rows) {
    const key = keyForRow(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()]
    .map(([key, groupRows]) => {
      const summary = buildOpsSummary(groupRows);
      const latencyRows = groupRows.filter((row) => row.latencyMs !== null);
      const totalLatencyMs = latencyRows.reduce((total, row) => total + (row.latencyMs ?? 0), 0);

      return {
        key,
        requestCount: summary.requestCount,
        successRate: summary.successRate,
        fallbackRate: summary.fallbackRate,
        averageLatencyMs: latencyRows.length > 0 ? Math.round(totalLatencyMs / latencyRows.length) : null,
        revenueUsdMicros: summary.revenueUsdMicros,
        providerCostUsdMicros: summary.providerCostUsdMicros,
        grossMarginUsdMicros: summary.grossMarginUsdMicros,
        averageMarginUsdMicros:
          summary.requestCount > 0 ? summary.grossMarginUsdMicros / BigInt(summary.requestCount) : 0n,
        topActualPath: topActualPath(groupRows)
      };
    })
    .sort((a, b) => b.requestCount - a.requestCount);
}

function buildFallbackRows(rows: OpsRequestMetricInput[]): OpsFallbackRow[] {
  const fallbackRows = rows.filter((row) => row.fallbackUsed);
  const groups = new Map<string, OpsRequestMetricInput[]>();

  for (const row of fallbackRows) {
    const from = `${row.fallbackFromProvider ?? "unknown"} / ${row.fallbackFromModel ?? "unknown"}`;
    const to = actualPath(row);
    const key = `${from} -> ${to}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()]
    .map(([path, groupRows]) => {
      const summary = buildOpsSummary(groupRows);

      return {
        path,
        requestCount: summary.requestCount,
        successRate: summary.successRate,
        revenueUsdMicros: summary.revenueUsdMicros,
        providerCostUsdMicros: summary.providerCostUsdMicros
      };
    })
    .sort((a, b) => b.requestCount - a.requestCount);
}

function toFailureRow(row: OpsRequestMetricInput): OpsFailureRow {
  return {
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    requestedIntent: requestedIntent(row),
    actualPath: actualPath(row),
    fallbackUsed: row.fallbackUsed,
    status: row.status,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    latencyMs: row.latencyMs,
    revenueUsdMicros: row.revenueUsdMicros,
    providerCostUsdMicros: row.providerCostUsdMicros
  };
}

export function buildOpsDashboardData(filters: OpsFilters, rows: OpsRequestMetricInput[]): OpsDashboardData {
  return buildOpsDashboardDataWithAbuse(filters, rows, []);
}

function buildAbuseReasonRows(rows: OpsAbuseEventRow[]): OpsAbuseReasonRow[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.reasonCode, (counts.get(row.reasonCode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildOpsDashboardDataWithAbuse(
  filters: OpsFilters,
  rows: OpsRequestMetricInput[],
  abuseRows: OpsAbuseEventRow[]
): OpsDashboardData {
  return {
    filters,
    summary: buildOpsSummary(rows),
    policyRows: buildBreakdown(rows, (row) => row.requestedRoutePolicy ?? "explicit model"),
    providerRows: buildBreakdown(rows, (row) => row.actualProvider),
    fallbackRows: buildFallbackRows(rows),
    marginRows: buildBreakdown(rows, (row) => actualPath(row)),
    recentFailures: rows
      .filter((row) => row.status === RequestLogStatus.ERROR)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 25)
      .map(toFailureRow),
    recentAbuseEvents: abuseRows.slice(0, 25),
    abuseReasonRows: buildAbuseReasonRows(abuseRows)
  };
}

export async function getOpsDashboardData(filters: OpsFilters) {
  const windowStart = getWindowStart(filters.window);
  const [rows, abuseRows] = await Promise.all([
    db.requestLog.findMany({
      where: buildOpsWhere(filters),
      include: {
        usageLedgerEntry: {
          include: {
            balanceTransaction: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    db.abuseEvent.findMany({
      where: {
        createdAt: {
          gte: windowStart
        },
        ...(filters.routePolicy && filters.routePolicy !== "explicit"
          ? {
              routePolicy: filters.routePolicy
            }
          : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    })
  ]);

  return buildOpsDashboardDataWithAbuse(
    filters,
    rows.map(toMetricInput),
    abuseRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      userId: row.userId,
      apiKeyId: row.apiKeyId,
      eventType: row.eventType,
      severity: row.severity,
      status: row.status,
      reasonCode: row.reasonCode,
      routePolicy: row.routePolicy,
      requestedModel: row.requestedModel
    }))
  );
}
