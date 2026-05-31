import { Prisma, RequestLogStatus } from "@prisma/client";

import { db } from "@/lib/db";
import type { ObservabilityFilters, ObservabilityRow, ObservabilitySummary } from "@/lib/observability/types";

export function filterObservabilityRows(rows: ObservabilityRow[], filters: ObservabilityFilters) {
  return rows.filter((row) => {
    if (filters.provider && row.actualProvider !== filters.provider) {
      return false;
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }

    if (filters.routePolicy && row.requestedRoutePolicy !== filters.routePolicy) {
      return false;
    }

    if (filters.fallbackUsed === "true" && !row.fallbackUsed) {
      return false;
    }

    if (filters.fallbackUsed === "false" && row.fallbackUsed) {
      return false;
    }

    return true;
  });
}

type RequestLogWithUsage = Prisma.RequestLogGetPayload<{
  include: {
    usageLedgerEntry: true;
  };
}>;

function toObservabilityRow(row: RequestLogWithUsage): ObservabilityRow {
  return {
    id: row.id,
    createdAt: row.createdAt,
    requestType: row.requestType,
    requestedRoutePolicy: row.routePolicy,
    requestedModel: row.requestedModel,
    actualProvider: row.provider,
    actualUpstreamModel: row.upstreamModel,
    fallbackUsed: row.fallbackUsed,
    fallbackFromProvider: row.fallbackFromProvider,
    fallbackFromModel: row.fallbackFromModel,
    routeReason: row.routeReason,
    status: row.status,
    latencyMs: row.latencyMs,
    totalTokens: row.totalTokens,
    totalCostUsdMicros: row.usageLedgerEntry?.totalCostUsdMicros ?? null,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage
  };
}

export function buildObservabilitySummary(rows: ObservabilityRow[]): ObservabilitySummary {
  const successCount = rows.filter((row) => row.status === RequestLogStatus.SUCCESS).length;
  const fallbackCount = rows.filter((row) => row.fallbackUsed).length;
  const spendByProviderMap = new Map<string, bigint>();
  let totalSpendUsdMicros = 0n;

  for (const row of rows) {
    const cost = row.totalCostUsdMicros ?? 0n;
    totalSpendUsdMicros += cost;
    spendByProviderMap.set(row.actualProvider, (spendByProviderMap.get(row.actualProvider) ?? 0n) + cost);
  }

  const spendByProvider = [...spendByProviderMap.entries()]
    .map(([provider, total]) => ({
      provider,
      totalSpendUsdMicros: total
    }))
    .sort((a, b) => (a.totalSpendUsdMicros > b.totalSpendUsdMicros ? -1 : 1));

  return {
    requestsLast24h: rows.length,
    successRate: rows.length > 0 ? successCount / rows.length : 0,
    fallbackRate: rows.length > 0 ? fallbackCount / rows.length : 0,
    totalSpendUsdMicros,
    topProvider: spendByProvider[0] ?? null,
    spendByProvider
  };
}

function buildObservabilityWhere(userId: string, filters: ObservabilityFilters, createdAtGte?: Date): Prisma.RequestLogWhereInput {
  return {
    userId,
    ...(createdAtGte
      ? {
          createdAt: {
            gte: createdAtGte
          }
        }
      : {}),
    ...(filters.provider
      ? {
          provider: filters.provider
        }
      : {}),
    ...(filters.status
      ? {
          status: filters.status
        }
      : {}),
    ...(filters.routePolicy
      ? {
          routePolicy: filters.routePolicy
        }
      : {}),
    ...(filters.fallbackUsed
      ? {
          fallbackUsed: filters.fallbackUsed === "true"
        }
      : {})
  };
}

export async function getObservabilityPageData(userId: string, filters: ObservabilityFilters) {
  const last24hCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const baseWhere = buildObservabilityWhere(userId, filters);
  const summaryWhere = buildObservabilityWhere(userId, filters, last24hCutoff);

  const requestLogs = await db.requestLog.findMany({
    where: baseWhere,
    include: {
      usageLedgerEntry: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  const rows = requestLogs.map(toObservabilityRow);
  const summaryRequestLogs = await db.requestLog.findMany({
    where: summaryWhere,
    include: {
      usageLedgerEntry: true
    }
  });
  const summaryRows = summaryRequestLogs.map(toObservabilityRow);

  return {
    rows,
    summary: buildObservabilitySummary(summaryRows)
  };
}

export async function getObservabilityRequestDetail(userId: string, requestLogId: string) {
  return db.requestLog.findFirst({
    where: {
      id: requestLogId,
      userId
    },
    include: {
      usageLedgerEntry: {
        include: {
          balanceTransaction: true
        }
      }
    }
  });
}
