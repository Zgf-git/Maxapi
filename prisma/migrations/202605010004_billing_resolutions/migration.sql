-- CreateEnum
CREATE TYPE "BillingResolutionType" AS ENUM ('REFUND', 'COMPENSATION');

-- CreateEnum
CREATE TYPE "BillingResolutionStatus" AS ENUM ('OPEN', 'APPLIED', 'CANCELED');

-- CreateTable
CREATE TABLE "BillingResolution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BillingResolutionType" NOT NULL,
    "status" "BillingResolutionStatus" NOT NULL DEFAULT 'OPEN',
    "amountUsdMicros" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "operatorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "BillingResolution_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BalanceTransaction" ADD COLUMN "billingResolutionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BalanceTransaction_billingResolutionId_key" ON "BalanceTransaction"("billingResolutionId");

-- CreateIndex
CREATE INDEX "BillingResolution_userId_createdAt_idx" ON "BillingResolution"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BillingResolution_status_createdAt_idx" ON "BillingResolution"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BillingResolution_type_createdAt_idx" ON "BillingResolution"("type", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_billingResolutionId_fkey" FOREIGN KEY ("billingResolutionId") REFERENCES "BillingResolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingResolution" ADD CONSTRAINT "BillingResolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
