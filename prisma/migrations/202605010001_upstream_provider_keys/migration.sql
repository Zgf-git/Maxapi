-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('OPENAI_COMPATIBLE');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "UpstreamKeyStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "ProviderType" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpstreamApiKey" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "keyCiphertext" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "baseUrlOverride" TEXT,
    "modelGroup" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "status" "UpstreamKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "quotaLimitUsdMicros" BIGINT,
    "quotaUsedUsdMicros" BIGINT NOT NULL DEFAULT 0,
    "dailyLimitRequests" INTEGER,
    "dailyUsedRequests" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpstreamApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "Provider_status_idx" ON "Provider"("status");

-- CreateIndex
CREATE INDEX "UpstreamApiKey_providerId_priority_idx" ON "UpstreamApiKey"("providerId", "priority");

-- CreateIndex
CREATE INDEX "UpstreamApiKey_providerId_status_idx" ON "UpstreamApiKey"("providerId", "status");

-- CreateIndex
CREATE INDEX "UpstreamApiKey_status_idx" ON "UpstreamApiKey"("status");

-- AddForeignKey
ALTER TABLE "UpstreamApiKey" ADD CONSTRAINT "UpstreamApiKey_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
