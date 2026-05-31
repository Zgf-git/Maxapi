-- AlterTable
ALTER TABLE "RequestLog"
ADD COLUMN "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fallbackFromProvider" TEXT,
ADD COLUMN "fallbackFromModel" TEXT,
ADD COLUMN "routeReason" TEXT;
