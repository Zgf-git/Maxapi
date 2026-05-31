import { BalanceTransactionType } from "@prisma/client";

import { createAuditLog } from "@/lib/audit/service";
import { getOrCreateUserBalance } from "@/lib/balance/service";
import { db } from "@/lib/db";

export async function applyManualBalanceAdjustment(input: {
  actorUserId: string;
  targetUserId: string;
  amountUsdMicros: bigint;
  reason: string;
}) {
  if (input.amountUsdMicros === 0n) {
    return { ok: false as const, error: "Adjustment amount cannot be zero." };
  }

  return db.$transaction(async (tx) => {
    const balance = await getOrCreateUserBalance(input.targetUserId, tx);
    const balanceBeforeUsdMicros = balance.balanceUsdMicros;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + input.amountUsdMicros;

    await tx.userBalance.update({
      where: { userId: input.targetUserId },
      data: {
        balanceUsdMicros: balanceAfterUsdMicros
      }
    });

    const transaction = await tx.balanceTransaction.create({
      data: {
        userId: input.targetUserId,
        type: BalanceTransactionType.ADJUSTMENT,
        amountUsdMicros: input.amountUsdMicros,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        reason: input.reason
      }
    });

    await createAuditLog({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: "admin.balance.adjust",
      resourceType: "balance_transaction",
      resourceId: transaction.id,
      metadata: {
        amountUsdMicros: input.amountUsdMicros.toString(),
        reason: input.reason
      }
    });

    return { ok: true as const, transaction };
  });
}
