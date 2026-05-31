CREATE TYPE "PlanTier" AS ENUM ('TRIAL', 'BUILDER', 'PRO', 'ENTERPRISE');

ALTER TABLE "User" ADD COLUMN "plan" "PlanTier" NOT NULL DEFAULT 'TRIAL';

CREATE INDEX "User_plan_idx" ON "User"("plan");
