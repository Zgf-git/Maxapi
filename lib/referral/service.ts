import { db } from "@/lib/db";

const REFERRAL_CODE_LENGTH = 8;
export const COMMISSION_RATE_PERCENT = 10;

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let existing = await db.user.findUnique({ where: { referralCode: code } });

  while (existing) {
    code = generateReferralCode();
    existing = await db.user.findUnique({ where: { referralCode: code } });
  }

  return code;
}

export async function findUserByReferralCode(code: string) {
  return db.user.findUnique({
    where: { referralCode: code },
    select: { id: true, email: true }
  });
}

export async function setUserReferral(userId: string, referredByUserId: string) {
  return db.user.update({
    where: { id: userId },
    data: { referredByUserId }
  });
}

export async function processReferralCommission(
  userId: string,
  purchaseAmountUsdMicros: bigint,
  sourceTransactionId: string
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { referredByUserId: true }
  });

  if (!user?.referredByUserId) {
    return null;
  }

  const referrerId = user.referredByUserId;
  const commissionAmount =
    (purchaseAmountUsdMicros * BigInt(COMMISSION_RATE_PERCENT)) / 100n;

  if (commissionAmount <= 0n) {
    return null;
  }

  const commission = await db.referralCommission.create({
    data: {
      referrerUserId: referrerId,
      referredUserId: userId,
      amountUsdMicros: commissionAmount,
      sourceTransactionId,
      status: "PENDING"
    }
  });

  return commission;
}

export async function payReferralCommission(commissionId: string) {
  const commission = await db.referralCommission.findUnique({
    where: { id: commissionId }
  });

  if (!commission || commission.status !== "PENDING") {
    return null;
  }

  await db.$transaction(async (tx) => {
    const balance = await tx.userBalance.findUnique({
      where: { userId: commission.referrerUserId }
    });

    const balanceBeforeUsdMicros = balance?.balanceUsdMicros ?? 0n;
    const balanceAfterUsdMicros = balanceBeforeUsdMicros + commission.amountUsdMicros;

    await tx.userBalance.upsert({
      where: { userId: commission.referrerUserId },
      create: {
        userId: commission.referrerUserId,
        balanceUsdMicros: balanceAfterUsdMicros
      },
      update: {
        balanceUsdMicros: balanceAfterUsdMicros
      }
    });

    await tx.balanceTransaction.create({
      data: {
        userId: commission.referrerUserId,
        type: "CREDIT",
        amountUsdMicros: commission.amountUsdMicros,
        balanceBeforeUsdMicros,
        balanceAfterUsdMicros,
        reason: `referral_commission:${commission.referredUserId}`
      }
    });

    await tx.referralCommission.update({
      where: { id: commissionId },
      data: { status: "PAID", paidAt: new Date() }
    });
  });

  return db.referralCommission.findUnique({ where: { id: commissionId } });
}

export async function getReferralStats(userId: string) {
  const [referralCount, totalCommission, pendingCommission] = await Promise.all([
    db.user.count({ where: { referredByUserId: userId } }),
    db.referralCommission.aggregate({
      where: { referrerUserId: userId, status: "PAID" },
      _sum: { amountUsdMicros: true }
    }),
    db.referralCommission.aggregate({
      where: { referrerUserId: userId, status: "PENDING" },
      _sum: { amountUsdMicros: true }
    })
  ]);

  return {
    referralCount,
    totalCommissionUsdMicros: totalCommission._sum.amountUsdMicros ?? 0n,
    pendingCommissionUsdMicros: pendingCommission._sum.amountUsdMicros ?? 0n
  };
}
