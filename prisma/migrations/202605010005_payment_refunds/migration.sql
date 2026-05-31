ALTER TABLE "BillingResolution"
ADD COLUMN "topUpPurchaseId" TEXT,
ADD COLUMN "stripeRefundId" TEXT,
ADD COLUMN "stripeRefundAmountUsdCents" INTEGER;

ALTER TABLE "TopUpPurchase"
ADD COLUMN "refundedUsdMicros" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "refundedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "BillingResolution_stripeRefundId_key" ON "BillingResolution"("stripeRefundId");
CREATE INDEX "BillingResolution_topUpPurchaseId_createdAt_idx" ON "BillingResolution"("topUpPurchaseId", "createdAt" DESC);

ALTER TABLE "BillingResolution"
ADD CONSTRAINT "BillingResolution_topUpPurchaseId_fkey"
FOREIGN KEY ("topUpPurchaseId") REFERENCES "TopUpPurchase"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
