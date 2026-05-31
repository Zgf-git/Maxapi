-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('REFUND', 'COMPENSATION', 'MANUAL_ADJUSTMENT', 'ABUSE_REVIEW');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "type" "CaseType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "targetUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "amountUsdMicros" BIGINT,
    "reason" TEXT,
    "metadata" JSONB,
    "decidedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Case_status_type_createdAt_idx" ON "Case"("status", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Case_targetUserId_createdAt_idx" ON "Case"("targetUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
