import { CostExplainability } from "@/components/explainability/cost-explainability";
import { RouteExplainability } from "@/components/explainability/route-explainability";
import { ModelCard } from "@/components/models/model-card";
import { RoutePolicyCard } from "@/components/models/route-policy-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePageUser } from "@/lib/auth/session";
import { getCatalogPolicyEntries, getPublicCatalogModels } from "@/lib/catalog";
import { canUseBilling } from "@/lib/run-mode";

export default async function DashboardModelsPage() {
  await requirePageUser();

  const policies = getCatalogPolicyEntries();
  const models = getPublicCatalogModels();

  return (
    <div className="space-y-6">
      <PageHeader
        description="Understand supported explicit models, managed route policies, fallback behavior, and how request logs explain actual execution."
        eyebrow="Models"
        title="Models and routing reference"
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <RouteExplainability dashboard />
        <CostExplainability dashboard showBillingLink={canUseBilling()} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Managed route policies</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Use these with `route_policy`. Actual provider/model is recorded in Requests after execution.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
          {policies.map((policy) => (
            <RoutePolicyCard key={policy.id} policy={policy} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Explicit public models</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Use these ids with `model` when you want a supported explicit target.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </section>
    </div>
  );
}
