-- CreateEnum
CREATE TYPE "RiskState" AS ENUM ('NORMAL', 'RATE_LIMITED', 'RESTRICTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "riskState" "RiskState" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "riskState" "RiskState" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcurrencyLease" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConcurrencyLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbuseEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "apiKeyId" TEXT,
    "ipAddressHash" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "routePolicy" TEXT,
    "requestedModel" TEXT,
    "actualProvider" TEXT,
    "status" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbuseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiKey_riskState_idx" ON "ApiKey"("riskState");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitCounter_key_key" ON "RateLimitCounter"("key");

-- CreateIndex
CREATE INDEX "RateLimitCounter_expiresAt_idx" ON "RateLimitCounter"("expiresAt");

-- CreateIndex
CREATE INDEX "ConcurrencyLease_scope_expiresAt_idx" ON "ConcurrencyLease"("scope", "expiresAt");

-- CreateIndex
CREATE INDEX "ConcurrencyLease_holderId_idx" ON "ConcurrencyLease"("holderId");

-- CreateIndex
CREATE INDEX "ConcurrencyLease_expiresAt_idx" ON "ConcurrencyLease"("expiresAt");

-- CreateIndex
CREATE INDEX "AbuseEvent_userId_createdAt_idx" ON "AbuseEvent"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AbuseEvent_apiKeyId_createdAt_idx" ON "AbuseEvent"("apiKeyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AbuseEvent_eventType_createdAt_idx" ON "AbuseEvent"("eventType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AbuseEvent_reasonCode_createdAt_idx" ON "AbuseEvent"("reasonCode", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AbuseEvent_ipAddressHash_createdAt_idx" ON "AbuseEvent"("ipAddressHash", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AbuseEvent" ADD CONSTRAINT "AbuseEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbuseEvent" ADD CONSTRAINT "AbuseEvent_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
