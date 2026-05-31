import { PlaygroundClient } from "@/components/playground/playground-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ApiKeyStatus } from "@prisma/client";
import { getPlanCatalogEntry } from "@/lib/plans/catalog";
import { getAvailableCatalogForPlan } from "@/lib/plans/catalog-availability";

export default async function PlaygroundPage() {
  const user = await requirePageUser();
  const activeApiKeyCount = await db.apiKey.count({
    where: {
      userId: user.id,
      status: ApiKeyStatus.ACTIVE
    }
  });
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { plan: true }
  });
  const planEntry = getPlanCatalogEntry(account?.plan);
  const availableCatalog = getAvailableCatalogForPlan(account?.plan);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Playground"
        title="API playground"
        description="Compose a real chat completion request, run it through routing, billing, logging, and risk controls, then inspect the actual execution path."
      />

      <PlaygroundClient
        defaultModelId={availableCatalog.defaultModelId}
        defaultRoutePolicy={availableCatalog.defaultRoutePolicy}
        hasActiveApiKey={activeApiKeyCount > 0}
        models={availableCatalog.models}
        planLabel={planEntry.label}
        policies={availableCatalog.policies}
      />
    </div>
  );
}
