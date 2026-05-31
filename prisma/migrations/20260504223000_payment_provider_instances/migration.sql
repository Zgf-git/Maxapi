CREATE TYPE "PaymentProviderInstanceStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "PaymentProviderInstance" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "PaymentProviderInstanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "supportsRefunds" BOOLEAN NOT NULL DEFAULT false,
    "minAmountUsdCents" INTEGER,
    "maxAmountUsdCents" INTEGER,
    "dailyLimitUsdCents" INTEGER,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderInstance_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TopUpPurchase"
ADD COLUMN "paymentProviderInstanceId" TEXT;

CREATE INDEX "PaymentProviderInstance_provider_status_priority_idx" ON "PaymentProviderInstance"("provider", "status", "priority");
CREATE INDEX "PaymentProviderInstance_status_updatedAt_idx" ON "PaymentProviderInstance"("status", "updatedAt" DESC);
CREATE INDEX "TopUpPurchase_paymentProvider_paymentProviderInstanceId_createdAt_idx" ON "TopUpPurchase"("paymentProvider", "paymentProviderInstanceId", "createdAt" DESC);

ALTER TABLE "TopUpPurchase"
ADD CONSTRAINT "TopUpPurchase_paymentProviderInstanceId_fkey"
FOREIGN KEY ("paymentProviderInstanceId") REFERENCES "PaymentProviderInstance"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
