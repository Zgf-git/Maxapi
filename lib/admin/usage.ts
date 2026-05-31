import { RequestLogStatus, UsageLedgerStatus } from "@prisma/client";

import { createAuditLog } from "@/lib/audit/service";
import { finalizeUsageCharge, markUsageLedgerState } from "@/lib/billing/ledger";
import { calculateUsageCost } from "@/lib/billing/calculator";
import { db } from "@/lib/db";
import { getOrCreateUserBalance } from "@/lib/balance/service";
import { BalanceTransactionType } from "@prisma/client";
import { getPricingRule } from "@/lib/pricing";
import type { ProviderName } from "@/lib/providers/types";

export async function listPendingUsageEntries(limit = 50) {
  return db.usageLedgerEntry.findMany({
    where: {
      status: UsageLedgerStatus.PENDING
    },
    include: {
      requestLog: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });
}

export async function listFinalizedUsageEntries(limit = 20) {
  return db.usageLedgerEntry.findMany({
    where: {
      status: UsageLedgerStatus.FINALIZED
    },
    include: {
      balanceTransaction: true,
      requestLog: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: {
      finalizedAt: "desc"
    },
    take: limit
  });
}

function usageSnapshotFromLedger(ledger: {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  promptCacheHitTokens: number | null;
  promptCacheMissTokens: number | null;
  reasoningTokens: number | null;
}) {
  return {
    promptTokens: ledger.promptTokens,
    completionTokens: ledger.completionTokens,
    totalTokens: ledger.totalTokens,
    promptCacheHitTokens: ledger.promptCacheHitTokens,
    promptCacheMissTokens: ledger.promptCacheMissTokens,
    reasoningTokens: ledger.reasoningTokens
  };
}

export async function finalizePendingUsageEntry(input: {
  actorUserId: string;
  ledgerId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number | null;
}) {
  const ledger = await db.usageLedgerEntry.findUnique({
    where: { id: input.ledgerId },
    include: { requestLog: true }
  });

  if (!ledger || ledger.status !== UsageLedgerStatus.PENDING || !ledger.requestLogId) {
    return { ok: false as const, error: "Pending usage ledger entry not found." };
  }

  const totalTokens =
    input.totalTokens && input.totalTokens > 0
      ? input.totalTokens
      : input.promptTokens + input.completionTokens;

  await finalizeUsageCharge({
    userId: ledger.userId,
    apiKeyId: ledger.apiKeyId,
    requestLogId: ledger.requestLogId,
    provider: ledger.provider as ProviderName,
    requestedModel: ledger.requestedModel,
    upstreamModel: ledger.upstreamModel ?? ledger.requestedModel ?? "unknown-model",
    isStream: ledger.isStream,
    usage: {
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens,
      promptCacheHitTokens: null,
      promptCacheMissTokens: null,
      reasoningTokens: null
    }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: ledger.userId,
    action: "admin.usage.finalize_pending",
    resourceType: "usage_ledger",
    resourceId: ledger.id,
    metadata: {
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens
    }
  });

  return { ok: true as const };
}

export async function resolvePendingUsageEntry(input: {
  actorUserId: string;
  ledgerId: string;
  status: "UNBILLABLE" | "FAILED";
  notes?: string | null;
}) {
  const ledger = await db.usageLedgerEntry.findUnique({
    where: { id: input.ledgerId },
    include: { requestLog: true }
  });

  if (!ledger || ledger.status !== UsageLedgerStatus.PENDING || !ledger.requestLogId) {
    return { ok: false as const, error: "Pending usage ledger entry not found." };
  }

  await markUsageLedgerState({
    userId: ledger.userId,
    apiKeyId: ledger.apiKeyId,
    requestLogId: ledger.requestLogId,
    provider: ledger.provider as ProviderName,
    requestedModel: ledger.requestedModel,
    upstreamModel: ledger.upstreamModel,
    isStream: ledger.isStream,
    status: input.status,
    notes: input.notes ?? null,
    errorReason: input.status === "FAILED" ? "manual_admin_resolution" : "manual_admin_unbillable"
  });

  if (input.status === "FAILED") {
    await db.requestLog.update({
      where: { id: ledger.requestLogId },
      data: {
        status: RequestLogStatus.ERROR,
        errorCode: "manual_usage_resolution",
        errorMessage: input.notes ?? "Manually marked failed from admin console."
      }
    }).catch(() => undefined);
  }

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: ledger.userId,
    action: "admin.usage.resolve_pending",
    resourceType: "usage_ledger",
    resourceId: ledger.id,
    metadata: {
      status: input.status,
      notes: input.notes ?? null
    }
  });

  return { ok: true as const };
}

export async function recalculateFinalizedUsageEntry(input: {
  actorUserId: string;
  ledgerId: string;
}) {
  const ledger = await db.usageLedgerEntry.findUnique({
    where: { id: input.ledgerId },
    include: {
      balanceTransaction: true
    }
  });

  if (!ledger || ledger.status !== UsageLedgerStatus.FINALIZED || !ledger.balanceTransaction) {
    return { ok: false as const, error: "Finalized usage ledger entry not found." };
  }

  const pricingRule = getPricingRule(
    ledger.provider as ProviderName,
    ledger.upstreamModel ?? ledger.requestedModel ?? "unknown-model"
  );
  const recalculated = calculateUsageCost(usageSnapshotFromLedger(ledger), pricingRule);
  const oldTotalCostUsdMicros = ledger.totalCostUsdMicros ?? 0n;
  const deltaUsdMicros = oldTotalCostUsdMicros - recalculated.totalCostUsdMicros;

  await db.$transaction(async (tx) => {
    await tx.usageLedgerEntry.update({
      where: { id: ledger.id },
      data: {
        pricingVersion: pricingRule.pricingVersion,
        pricingSnapshot: {
          provider: pricingRule.provider,
          model: pricingRule.model,
          requestType: pricingRule.requestType ?? "chat",
          pricingVersion: pricingRule.pricingVersion
        },
        usageSnapshot: recalculated.usage,
        inputCostUsdMicros: recalculated.inputCostUsdMicros,
        outputCostUsdMicros: recalculated.outputCostUsdMicros,
        totalCostUsdMicros: recalculated.totalCostUsdMicros,
        finalizedAt: new Date(),
        notes:
          deltaUsdMicros === 0n
            ? ledger.notes
            : `Recalculated by admin. Previous total ${oldTotalCostUsdMicros}, new total ${recalculated.totalCostUsdMicros}.`
      }
    });

    if (deltaUsdMicros !== 0n) {
      const balance = await getOrCreateUserBalance(ledger.userId, tx);
      const balanceBeforeUsdMicros = balance.balanceUsdMicros;
      const balanceAfterUsdMicros = balanceBeforeUsdMicros + deltaUsdMicros;

      await tx.userBalance.update({
        where: { userId: ledger.userId },
        data: {
          balanceUsdMicros: balanceAfterUsdMicros
        }
      });

      await tx.balanceTransaction.create({
        data: {
          userId: ledger.userId,
          type: BalanceTransactionType.ADJUSTMENT,
          amountUsdMicros: deltaUsdMicros,
          balanceBeforeUsdMicros,
          balanceAfterUsdMicros,
          reason: `usage_recalc:${ledger.id}`
        }
      });
    }
  });

  await createAuditLog({
    actorUserId: input.actorUserId,
    targetUserId: ledger.userId,
    action: "admin.usage.recalculate_finalized",
    resourceType: "usage_ledger",
    resourceId: ledger.id,
    metadata: {
      previousTotalCostUsdMicros: oldTotalCostUsdMicros.toString(),
      recalculatedTotalCostUsdMicros: recalculated.totalCostUsdMicros.toString(),
      adjustmentUsdMicros: deltaUsdMicros.toString()
    }
  });

  return { ok: true as const };
}
