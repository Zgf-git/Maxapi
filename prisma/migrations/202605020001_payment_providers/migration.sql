CREATE TYPE "PaymentProvider" AS ENUM ('PAYPAL', 'ALIPAY', 'WECHAT');

ALTER TABLE "BillingResolution"
ADD COLUMN "paymentProvider" "PaymentProvider",
ADD COLUMN "providerRefundId" TEXT,
ADD COLUMN "providerRefundAmountMinor" INTEGER;

ALTER TABLE "TopUpPurchase"
ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'PAYPAL',
ADD COLUMN "providerOrderId" TEXT,
ADD COLUMN "providerPaymentId" TEXT,
ADD COLUMN "providerEventIdLastProcessed" TEXT,
ADD COLUMN "providerMetadata" JSONB;

CREATE UNIQUE INDEX "BillingResolution_providerRefundId_key" ON "BillingResolution"("providerRefundId");
CREATE INDEX "TopUpPurchase_paymentProvider_createdAt_idx" ON "TopUpPurchase"("paymentProvider", "createdAt" DESC);

CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "topUpPurchaseId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentWebhookEvent_provider_createdAt_idx" ON "PaymentWebhookEvent"("provider", "createdAt" DESC);
CREATE INDEX "PaymentWebhookEvent_topUpPurchaseId_createdAt_idx" ON "PaymentWebhookEvent"("topUpPurchaseId", "createdAt" DESC);
CREATE INDEX "PaymentWebhookEvent_status_createdAt_idx" ON "PaymentWebhookEvent"("status", "createdAt" DESC);

ALTER TABLE "PaymentWebhookEvent"
ADD CONSTRAINT "PaymentWebhookEvent_topUpPurchaseId_fkey"
FOREIGN KEY ("topUpPurchaseId") REFERENCES "TopUpPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
