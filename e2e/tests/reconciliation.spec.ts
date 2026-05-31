import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const RECON_USER_EMAIL = "e2e-recon@maxapi.test";

async function cleanupReconData() {
  const user = await db.user.findUnique({ where: { email: RECON_USER_EMAIL } });
  if (!user) return;

  await db.balanceTransaction.deleteMany({ where: { userId: user.id } });
  await db.usageLedgerEntry.deleteMany({ where: { userId: user.id } });
  await db.requestLog.deleteMany({ where: { userId: user.id } });
  await db.apiKey.deleteMany({ where: { userId: user.id } });
  await db.userBalance.deleteMany({ where: { userId: user.id } });
  await db.user.deleteMany({ where: { id: user.id } });
}

async function setupReconData() {
  await cleanupReconData();

  const user = await db.user.create({
    data: {
      email: RECON_USER_EMAIL,
      name: "E2E Recon User",
      passwordHash: "dummy-hash",
      emailVerifiedAt: new Date(),
      role: "USER",
    },
  });

  const initialCredit = 10_000_000n;
  await db.userBalance.create({
    data: { userId: user.id, balanceUsdMicros: initialCredit },
  });

  await db.balanceTransaction.create({
    data: {
      userId: user.id,
      type: "CREDIT",
      amountUsdMicros: initialCredit,
      balanceBeforeUsdMicros: 0n,
      balanceAfterUsdMicros: initialCredit,
      reason: "Initial test credit",
    },
  });

  const debitAmount = 2_500_000n;
  await db.balanceTransaction.create({
    data: {
      userId: user.id,
      type: "DEBIT",
      amountUsdMicros: -debitAmount,
      balanceBeforeUsdMicros: initialCredit,
      balanceAfterUsdMicros: initialCredit - debitAmount,
      reason: "Test usage charge",
    },
  });

  await db.userBalance.update({
    where: { userId: user.id },
    data: { balanceUsdMicros: initialCredit - debitAmount },
  });

  const apiKey = await db.apiKey.create({
    data: {
      userId: user.id,
      name: "Recon Test Key",
      keyHash: "test-hash-recon",
      keyPrefix: "mk_live_test1234",
      lastFour: "test",
      status: "ACTIVE",
      isEnabled: true,
    },
  });

  const requestLog = await db.requestLog.create({
    data: {
      apiKeyId: apiKey.id,
      userId: user.id,
      provider: "openai",
      upstreamModel: "gpt-4",
      requestedModel: "gpt-4",
      requestType: "CHAT_COMPLETION",
      isStream: false,
      status: "SUCCESS",
      httpStatus: 200,
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      latencyMs: 500,
    },
  });

  await db.usageLedgerEntry.create({
    data: {
      userId: user.id,
      apiKeyId: apiKey.id,
      requestLogId: requestLog.id,
      provider: "openai",
      requestedModel: "gpt-4",
      upstreamModel: "gpt-4",
      pricingVersion: "v1",
      status: "FINALIZED",
      isStream: false,
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      totalCostUsdMicros: 2_500_000n,
    },
  });

  return { userId: user.id, apiKeyId: apiKey.id, requestLogId: requestLog.id };
}

test.describe("data reconciliation", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await cleanupReconData();
    await setupReconData();
  });

  test.afterAll(async () => {
    await cleanupReconData();
    await db.$disconnect();
  });

  test("user balance equals sum of balance transactions", async () => {
    const result = await db.user.findFirst({
      where: { email: RECON_USER_EMAIL },
      include: { userBalance: true, balanceTransactions: true },
    });

    expect(result).not.toBeNull();
    expect(result!.userBalance).not.toBeNull();

    const currentBalance = result!.userBalance!.balanceUsdMicros;
    const txSum = result!.balanceTransactions.reduce(
      (sum, tx) => sum + tx.amountUsdMicros,
      0n
    );

    expect(currentBalance).toBe(txSum);
    expect(currentBalance).toBe(7_500_000n);
  });

  test("balance transaction amounts match running balance", async () => {
    const txs = await db.balanceTransaction.findMany({
      where: { user: { email: RECON_USER_EMAIL } },
      orderBy: { createdAt: "asc" },
    });

    expect(txs.length).toBe(2);

    expect(txs[0].type).toBe("CREDIT");
    expect(txs[0].amountUsdMicros).toBe(10_000_000n);
    expect(txs[0].balanceBeforeUsdMicros).toBe(0n);
    expect(txs[0].balanceAfterUsdMicros).toBe(10_000_000n);

    expect(txs[1].type).toBe("DEBIT");
    expect(txs[1].amountUsdMicros).toBe(-2_500_000n);
    expect(txs[1].balanceBeforeUsdMicros).toBe(10_000_000n);
    expect(txs[1].balanceAfterUsdMicros).toBe(7_500_000n);

    expect(txs[0].balanceBeforeUsdMicros + txs[0].amountUsdMicros).toBe(
      txs[0].balanceAfterUsdMicros
    );
    expect(txs[1].balanceBeforeUsdMicros + txs[1].amountUsdMicros).toBe(
      txs[1].balanceAfterUsdMicros
    );
    expect(txs[1].balanceBeforeUsdMicros).toBe(txs[0].balanceAfterUsdMicros);
  });

  test("no orphan API keys (all userId references exist)", async () => {
    const userIds = (await db.user.findMany({ select: { id: true } })).map((u) => u.id);
    const orphanKeys = await db.apiKey.findMany({
      where: { NOT: { userId: { in: userIds } } },
    });
    expect(orphanKeys.length).toBe(0);
  });

  test("no orphan request logs (userId references exist if set)", async () => {
    const userIds = (await db.user.findMany({ select: { id: true } })).map((u) => u.id);
    const orphanLogs = await db.requestLog.findMany({
      where: {
        AND: [
          { userId: { not: null } },
          { NOT: { userId: { in: userIds } } },
        ],
      },
    });
    expect(orphanLogs.length).toBe(0);
  });

  test("usage ledger entries reference valid request logs", async () => {
    const logIds = (await db.requestLog.findMany({ select: { id: true } })).map((r) => r.id);
    const orphanLedgers = await db.usageLedgerEntry.findMany({
      where: {
        requestLogId: { not: null },
        NOT: { requestLogId: { in: logIds } },
      },
    });
    expect(orphanLedgers.length).toBe(0);
  });

  test("usage ledger entries reference valid API keys", async () => {
    const keyIds = (await db.apiKey.findMany({ select: { id: true } })).map((k) => k.id);
    const orphanLedgers = await db.usageLedgerEntry.findMany({
      where: { NOT: { apiKeyId: { in: keyIds } } },
    });
    expect(orphanLedgers.length).toBe(0);
  });

  test("usage ledger entries reference valid users", async () => {
    const userIds = (await db.user.findMany({ select: { id: true } })).map((u) => u.id);
    const orphanLedgers = await db.usageLedgerEntry.findMany({
      where: { NOT: { userId: { in: userIds } } },
    });
    expect(orphanLedgers.length).toBe(0);
  });

  test("request log token counts are consistent", async () => {
    const log = await db.requestLog.findFirst({
      where: { user: { email: RECON_USER_EMAIL } },
    });
    expect(log).not.toBeNull();
    expect(log!.promptTokens! + log!.completionTokens!).toBe(log!.totalTokens!);
  });

  test("no user has more than one balance record", async () => {
    const allBalances = await db.userBalance.findMany({ select: { userId: true } });
    const counts = new Map<string, number>();
    for (const b of allBalances) {
      counts.set(b.userId, (counts.get(b.userId) || 0) + 1);
    }
    const duplicates = [...counts.entries()].filter(([, c]) => c > 1);
    expect(duplicates.length).toBe(0);
  });

  test("balance transaction types are valid", async () => {
    const invalidTxs = await db.balanceTransaction.findMany({
      where: { type: { notIn: ["CREDIT", "DEBIT", "ADJUSTMENT"] } },
    });
    expect(invalidTxs.length).toBe(0);
  });

  test("reconciled user has transaction history (not in no-tx list)", async () => {
    const usersWithBalanceNoTx = await db.user.findMany({
      where: {
        userBalance: { balanceUsdMicros: { gt: 0n } },
        balanceTransactions: { none: {} },
      },
      select: { email: true },
    });

    const reconUserInList = usersWithBalanceNoTx.some(
      (u) => u.email === RECON_USER_EMAIL
    );
    expect(reconUserInList).toBe(false);
  });

  test("no users with negative balance", async () => {
    const negativeUsers = await db.user.findMany({
      where: { userBalance: { balanceUsdMicros: { lt: 0n } } },
      select: { email: true },
    });
    expect(negativeUsers.length).toBe(0);
  });

  test("all request logs have valid status values", async () => {
    const invalid = await db.requestLog.findMany({
      where: { status: { notIn: ["SUCCESS", "ERROR"] } },
    });
    expect(invalid.length).toBe(0);
  });

  test("all API keys have valid status values", async () => {
    const invalid = await db.apiKey.findMany({
      where: { status: { notIn: ["ACTIVE", "REVOKED"] } },
    });
    expect(invalid.length).toBe(0);
  });
});
