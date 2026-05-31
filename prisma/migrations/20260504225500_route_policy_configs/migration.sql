CREATE TABLE "RoutePolicyConfig" (
    "id" TEXT NOT NULL,
    "routePolicy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "targets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePolicyConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoutePolicyConfig_routePolicy_key" ON "RoutePolicyConfig"("routePolicy");
CREATE INDEX "RoutePolicyConfig_status_updatedAt_idx" ON "RoutePolicyConfig"("status", "updatedAt" DESC);
