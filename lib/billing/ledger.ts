import { BalanceTransactionType, Prisma, UsageLedgerStatus } from "@prisma/client";

import { getOrCreateUserBalance } from "@/lib/balance/service";
import type { ProviderUsageSnapshot } from "@/lib/billing/types";
import { db } from "@/lib/db";
import { calculateUsageCost } from "@/lib/billing/calculator";
import { getPricingRule } from "@/lib/pricing";
import type { ProviderName } from "@/lib/providers/types";
import type { PricingRule } from "@/lib/pricing/types";

type FinalizeChargeInput = {
  userId: string;
  apiKeyId: string;
  requestLogId: string;
  provider: ProviderName;
  requestedModel: string | null;
  upstreamModel: string;
  isStream: boolean;
  usage: ProviderUsageSnapshot;
};

type MarkUsageStateInput = {
  userId: string;
  apiKeyId: string;
  requestLogId: string;
  provider: ProviderName;
  requestedModel: string | null;
  upstreamModel: string | null;
  isStream: boolean;
  status: "PENDING" | "UNBILLABLE" | "FAILED";
  notes?: string | null;
  errorReason?: string | null;
};

function toUsageColumns(usage: ProviderUsageSnapshot) {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    promptCacheHitTokens: usage.promptCacheHitTokens,
    promptCacheMissTokens: usage.promptCacheMissTokens,
    reasoningTokens: usage.reasoningTokens
  };
}

function buildPricingSnapshot(pricingRule: PricingRule) {
  return {
    provider: pricingRule.provider,
    model: pricingRule.model,
    requestType: pricingRule.requestType ?? "chat",
    pricingVersion: pricingRule.pricingVersion,
    inputCacheHitUsdMicrosPerMillion: pricingRule.inputCacheHitUsdMicrosPerMillion.toString(),
    inputCacheMissUsdMicrosPerMillion: pricingRule.inputCacheMissUsdMicrosPerMillion.toString(),
    inputStandardUsdMicrosPerMillion: pricingRule.inputStandardUsdMicrosPerMillion.toString(),
    outputUsdMicrosPerMillion: pricingRule.outputUsdMicrosPerMillion.toString(),
    billReasoningTokensSeparately: pricingRule.billReasoningTokensSeparately,
    longContextThresholdTokens: pricingRule.longContextThresholdTokens ?? null,
    inputLongContextStandardUsdMicrosPerMillion: pricingRule.inputLongContextStandardUsdMicrosPerMillion?.toString() ?? null,
    inputLongContextCacheHitUsdMicrosPerMillion: pricingRule.inputLongContextCacheHitUsdMicrosPerMillion?.toString() ?? null,
    inputLongContextCacheMissUsdMicrosPerMillion: pricingRule.inputLongContextCacheMissUsdMicrosPerMillion?.toString() ?? null,
    outputLongContextUsdMicrosPerMillion: pricingRule.outputLongContextUsdMicrosPerMillion?.toString() ?? null
  };
}

async function findFinalizedUsageCharge(requestLogId: string) {
  return db.usageLedgerEntry.findUnique({
    where: { requestLogId },
    include: {
      balanceTransaction: true
    }
  });
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function finalizeUsageCharge(input: FinalizeChargeInput) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.usageLedgerEntry.findUnique({
          where: { requestLogId: input.requestLogId },
          include: {
            balanceTransaction: true
          }
        });

        if (existing?.status === UsageLedgerStatus.FINALIZED && existing.balanceTransaction) {
          return existing;
        }

        const pricingRule = getPricingRule(input.provider, input.upstreamModel);
        const calculated = calculateUsageCost(input.usage, pricingRule);
        const balance = await getOrCreateUserBalance(input.userId, tx);

        const ledger = existing
          ? await tx.usageLedgerEntry.update({
              where: { id: existing.id },
              data: {
                provider: input.provider,
                requestedModel: input.requestedModel,
                upstreamModel: input.upstreamModel,
                pricingVersion: pricingRule.pricingVersion,
                pricingSnapshot: buildPricingSnapshot(pricingRule),
                usageSnapshot: calculated.usage,
                status: UsageLedgerStatus.FINALIZED,
                isStream: input.isStream,
                ...toUsageColumns(calculated.usage),
                inputCostUsdMicros: calculated.inputCostUsdMicros,
                outputCostUsdMicros: calculated.outputCostUsdMicros,
                totalCostUsdMicros: calculated.totalCostUsdMicros,
                chargedAt: new Date(),
                finalizedAt: new Date(),
                notes: null,
                errorReason: null
              }
            })
          : await tx.usageLedgerEntry.create({
              data: {
                userId: input.userId,
                apiKeyId: input.apiKeyId,
                requestLogId: input.requestLogId,
                provider: input.provider,
                requestedModel: input.requestedModel,
                upstreamModel: input.upstreamModel,
                pricingVersion: pricingRule.pricingVersion,
                pricingSnapshot: buildPricingSnapshot(pricingRule),
                usageSnapshot: calculated.usage,
                status: UsageLedgerStatus.FINALIZED,
                isStream: input.isStream,
                ...toUsageColumns(calculated.usage),
                inputCostUsdMicros: calculated.inputCostUsdMicros,
                outputCostUsdMicros: calculated.outputCostUsdMicros,
                totalCostUsdMicros: calculated.totalCostUsdMicros,
                chargedAt: new Date(),
                finalizedAt: new Date()
              }
            });

        const existingTxn = await tx.balanceTransaction.findUnique({
          where: {
            usageLedgerId: ledger.id
          }
        });

        if (existingTxn) {
          return ledger;
        }

        const balanceBeforeUsdMicros = balance.balanceUsdMicros;
        const deductAmountUsdMicros = calculated.totalCostUsdMicros;
        const balanceAfterUsdMicros = balanceBeforeUsdMicros - deductAmountUsdMicros;

        await tx.userBalance.update({
          where: { userId: input.userId },
          data: {
            balanceUsdMicros: balanceAfterUsdMicros
          }
        });

        await tx.balanceTransaction.create({
          data: {
            userId: input.userId,
            type: BalanceTransactionType.DEBIT,
            amountUsdMicros: deductAmountUsdMicros,
            balanceBeforeUsdMicros,
            balanceAfterUsdMicros,
            usageLedgerId: ledger.id,
            reason: `chat_completion:${input.provider}:${input.requestedModel}`
          }
        });

        if (balanceAfterUsdMicros < 0n) {
          await tx.usageLedgerEntry.update({
            where: { id: ledger.id },
            data: {
              notes: `Balance went negative after final charge (cost ${calculated.totalCostUsdMicros}, balance ${balanceBeforeUsdMicros}).`
            }
          });
        }

        return ledger;
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existing = await findFinalizedUsageCharge(input.requestLogId);

      if (existing?.status === UsageLedgerStatus.FINALIZED && existing.balanceTransaction) {
        return existing;
      }

      if (attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Usage charge finalization exhausted retries without a finalized record.");
}

export async function markUsageLedgerState(input: MarkUsageStateInput) {
  const existing = await db.usageLedgerEntry.findUnique({
    where: { requestLogId: input.requestLogId }
  });

  if (existing?.status === UsageLedgerStatus.FINALIZED) {
    return existing;
  }

  if (existing) {
    return db.usageLedgerEntry.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        notes: input.notes ?? null,
        errorReason: input.errorReason ?? null,
        finalizedAt:
          input.status === UsageLedgerStatus.PENDING ? null : new Date()
      }
    });
  }

  return db.usageLedgerEntry.create({
    data: {
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      requestLogId: input.requestLogId,
      provider: input.provider,
      requestedModel: input.requestedModel,
      upstreamModel: input.upstreamModel,
      pricingVersion: "unpriced_pending",
      pricingSnapshot: Prisma.JsonNull,
      usageSnapshot: Prisma.JsonNull,
      status: input.status,
      isStream: input.isStream,
      notes: input.notes ?? null,
      errorReason: input.errorReason ?? null,
      finalizedAt: input.status === UsageLedgerStatus.PENDING ? null : new Date()
    }
  });
}
