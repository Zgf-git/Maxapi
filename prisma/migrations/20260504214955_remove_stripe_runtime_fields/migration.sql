UPDATE "BillingResolution"
SET
  "providerRefundId" = COALESCE("providerRefundId", "stripeRefundId"),
  "providerRefundAmountMinor" = COALESCE("providerRefundAmountMinor", "stripeRefundAmountUsdCents")
WHERE "stripeRefundId" IS NOT NULL
   OR "stripeRefundAmountUsdCents" IS NOT NULL;

DROP TABLE IF EXISTS "StripeWebhookEvent";

DROP INDEX IF EXISTS "TopUpPurchase_stripeCheckoutSessionId_key";
DROP INDEX IF EXISTS "BillingResolution_stripeRefundId_key";

ALTER TABLE "TopUpPurchase"
DROP COLUMN IF EXISTS "stripeCheckoutSessionId",
DROP COLUMN IF EXISTS "stripePaymentIntentId",
DROP COLUMN IF EXISTS "stripeEventIdLastProcessed";

ALTER TABLE "BillingResolution"
DROP COLUMN IF EXISTS "stripeRefundId",
DROP COLUMN IF EXISTS "stripeRefundAmountUsdCents";
