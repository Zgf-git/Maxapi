CREATE TYPE "RedemptionCodeStatus" AS ENUM ('ACTIVE', 'DISABLED', 'EXHAUSTED');
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'BILLING', 'VIEWER');
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "RedemptionCode" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "codePrefix" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "RedemptionCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "creditAmountUsdMicros" BIGINT NOT NULL,
  "maxRedemptions" INTEGER NOT NULL,
  "redeemedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RedemptionCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RedemptionCodeRedemption" (
  "id" TEXT NOT NULL,
  "redemptionCodeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balanceTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RedemptionCodeRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL,
  "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'all',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "billingOwnerUserId" TEXT,
  "monthlyBudgetUsdMicros" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL DEFAULT 'DEVELOPER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "monthlyBudgetUsdMicros" BIGINT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RedemptionCode_codeHash_key" ON "RedemptionCode"("codeHash");
CREATE INDEX "RedemptionCode_status_expiresAt_idx" ON "RedemptionCode"("status", "expiresAt");
CREATE INDEX "RedemptionCode_createdAt_idx" ON "RedemptionCode"("createdAt" DESC);

CREATE UNIQUE INDEX "RedemptionCodeRedemption_balanceTransactionId_key" ON "RedemptionCodeRedemption"("balanceTransactionId");
CREATE UNIQUE INDEX "RedemptionCodeRedemption_redemptionCodeId_userId_key" ON "RedemptionCodeRedemption"("redemptionCodeId", "userId");
CREATE INDEX "RedemptionCodeRedemption_userId_createdAt_idx" ON "RedemptionCodeRedemption"("userId", "createdAt" DESC);

CREATE INDEX "Announcement_status_startsAt_endsAt_idx" ON "Announcement"("status", "startsAt", "endsAt");
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt" DESC);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_billingOwnerUserId_idx" ON "Organization"("billingOwnerUserId");
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt" DESC);

CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_role_idx" ON "OrganizationMember"("role");

CREATE UNIQUE INDEX "Project_organizationId_slug_key" ON "Project"("organizationId", "slug");
CREATE INDEX "Project_organizationId_status_idx" ON "Project"("organizationId", "status");

ALTER TABLE "RedemptionCodeRedemption" ADD CONSTRAINT "RedemptionCodeRedemption_redemptionCodeId_fkey"
  FOREIGN KEY ("redemptionCodeId") REFERENCES "RedemptionCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
