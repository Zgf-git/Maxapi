-- CreateEnum
CREATE TYPE "TopUpPurchaseStatus" AS ENUM ('CREATED', 'CHECKOUT_CREATED', 'COMPLETED', 'CREDITED', 'CANCELED', 'FAILED');

-- AlterTable
ALTER TABLE "BalanceTransaction" ADD COLUMN "topUpPurchaseId" TEXT;

-- CreateTable
CREATE TABLE "TopUpPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeEventIdLastProcessed" TEXT,
    "amountUsdCents" INTEGER NOT NULL,
    "creditsUsdMicros" BIGINT NOT NULL,
    "status" "TopUpPurchaseStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creditedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "TopUpPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BalanceTransaction_topUpPurchaseId_key" ON "BalanceTransaction"("topUpPurchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TopUpPurchase_stripeCheckoutSessionId_key" ON "TopUpPurchase"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "TopUpPurchase_userId_createdAt_idx" ON "TopUpPurchase"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TopUpPurchase_status_createdAt_idx" ON "TopUpPurchase"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "BalanceTransaction" ADD CONSTRAINT "BalanceTransaction_topUpPurchaseId_fkey" FOREIGN KEY ("topUpPurchaseId") REFERENCES "TopUpPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopUpPurchase" ADD CONSTRAINT "TopUpPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
