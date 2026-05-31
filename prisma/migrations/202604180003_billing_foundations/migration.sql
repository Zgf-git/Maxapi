-- CreateEnum
CREATE TYPE "UsageLedgerStatus" AS ENUM ('PENDING', 'FINALIZED', 'UNBILLABLE', 'FAILED');

-- CreateEnum
CREATE TYPE "BalanceTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "UserBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceUsdMicros" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "requestLogId" TEXT,
    "provider" TEXT NOT NULL,
    "requestedModel" TEXT,
    "upstreamModel" TEXT,
    "pricingVersion" TEXT NOT NULL,
    "status" "UsageLedgerStatus" NOT NULL,
    "isStream" BOOLEAN NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "promptCacheHitTokens" INTEGER,
    "promptCacheMissTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "inputCostUsdMicros" BIGINT,
    "outputCostUsdMicros" BIGINT,
    "totalCostUsdMicros" BIGINT,
    "chargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "notes" TEXT,
    "errorReason" TEXT,

    CONSTRAINT "UsageLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BalanceTransactionType" NOT NULL,
    "amountUsdMicros" BIGINT NOT NULL,
    "balanceBeforeUsdMicros" BIGINT NOT NULL,
    "balanceAfterUsdMicros" BIGINT NOT NULL,
    "usageLedgerId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBalance_userId_key" ON "UserBalance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLedgerEntry_requestLogId_key" ON "UsageLedgerEntry"("requestLogId");

-- CreateIndex
CREATE INDEX "UsageLedgerEntry_userId_createdAt_idx" ON "UsageLedgerEntry"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UsageLedgerEntry_apiKeyId_createdAt_idx" ON "UsageLedgerEntry"("apiKeyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UsageLedgerEntry_status_createdAt_idx" ON "UsageLedgerEntry"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "BalanceTransaction_usageLedgerId_key" ON "BalanceTransaction"("usageLedgerId");

-- CreateIndex
CREATE INDEX "BalanceTransaction_userId_createdAt_idx" ON "BalanceTransaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BalanceTransaction_type_createdAt_idx" ON "BalanceTransaction"("type", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserBalance" ADD CONSTRAINT "UserBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLedgerEntry" ADD CONSTRAINT "UsageLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLedgerEntry" ADD CONSTRAINT "UsageLedgerEntry_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLedgerEntry" ADD CONSTRAINT "UsageLedgerEntry_requestLogId_fkey" FOREIGN KEY ("requestLogId") REFERENCES "RequestLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_usageLedgerId_fkey" FOREIGN KEY ("usageLedgerId") REFERENCES "UsageLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
