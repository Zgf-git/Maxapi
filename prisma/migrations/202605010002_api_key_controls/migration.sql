-- AlterTable
ALTER TABLE "ApiKey"
ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "requestsPerMinuteLimit" INTEGER,
ADD COLUMN "concurrentRequestsLimit" INTEGER,
ADD COLUMN "dailyRequestLimit" INTEGER,
ADD COLUMN "dailyRequestCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dailyRequestWindowStart" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ApiKey_userId_isEnabled_idx" ON "ApiKey"("userId", "isEnabled");
