ALTER TABLE "UsageLedgerEntry"
ADD COLUMN "pricingSnapshot" JSONB,
ADD COLUMN "usageSnapshot" JSONB;
