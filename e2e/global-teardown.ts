import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// Load environment variables for database connection
require("dotenv").config({ path: ".env.local" });

const db = new PrismaClient();

const SEED_FILE = path.join(__dirname, ".auth", "test-user-ids.json");

export default async function globalTeardown() {
  if (!fs.existsSync(SEED_FILE)) {
    return;
  }

  const userIds: Record<string, string> = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  const ids = Object.values(userIds);

  for (const userId of ids) {
    // Delete in dependency order
    await db.abuseEvent.deleteMany({ where: { userId } });
    await db.rateLimitCounter.deleteMany({ where: { key: { startsWith: userId } } });
    await db.concurrencyLease.deleteMany({ where: { holderId: userId } });

    // Usage ledger entries reference request logs and api keys
    const userApiKeys = await db.apiKey.findMany({ where: { userId }, select: { id: true } });
    const apiKeyIds = userApiKeys.map((k) => k.id);

    for (const keyId of apiKeyIds) {
      const ledgers = await db.usageLedgerEntry.findMany({
        where: { apiKeyId: keyId },
        select: { id: true },
      });
      for (const ledger of ledgers) {
        await db.balanceTransaction.deleteMany({ where: { usageLedgerId: ledger.id } });
      }
      await db.usageLedgerEntry.deleteMany({ where: { apiKeyId: keyId } });
    }

    // Request logs
    await db.requestLog.deleteMany({ where: { userId } });

    // API keys
    await db.apiKey.deleteMany({ where: { userId } });

    // Balance transactions
    await db.balanceTransaction.deleteMany({ where: { userId } });

    // Top up purchases
    await db.topUpPurchase.deleteMany({ where: { userId } });

    // Billing resolutions
    await db.billingResolution.deleteMany({ where: { userId } });

    // Cases
    await db.case.deleteMany({ where: { OR: [{ targetUserId: userId }, { actorUserId: userId }] } });

    // Redemptions
    await db.redemptionCodeRedemption.deleteMany({ where: { userId } });

    // Referrals
    await db.referralCommission.deleteMany({ where: { OR: [{ referrerUserId: userId }, { referredUserId: userId }] } });

    // Audit logs
    await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: userId }, { targetUserId: userId }] } });

    // Auth tokens
    await db.authToken.deleteMany({ where: { userId } });

    // User balance
    await db.userBalance.deleteMany({ where: { userId } });

    // Finally delete user
    await db.user.deleteMany({ where: { id: userId } });
  }

  fs.unlinkSync(SEED_FILE);
  await db.$disconnect();
}
