"use server";

import { db } from "@/lib/db";
import { COMMISSION_RATE_PERCENT } from "@/lib/referral/service";

export async function getReferralStats(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      _count: { select: { referredUsers: true } }
    }
  });

  if (!user) return null;

  const totals = await db.referralCommission.aggregate({
    where: {
      referrerUserId: userId,
      status: "PAID"
    },
    _sum: {
      amountUsdMicros: true
    }
  });

  return {
    code: user.referralCode,
    rate: COMMISSION_RATE_PERCENT,
    totalCommissionUsdMicros: totals._sum.amountUsdMicros ?? 0n,
    referralCount: user._count.referredUsers
  };
}
