import { EmptyState } from "@/components/internal/ui/empty-state";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listPolicies } from "@/lib/internal/routing";

export const metadata = {
  title: "Policies · Routing · Internal · MaxAPI"
};

export default async function InternalPoliciesPage() {
  const policies = await listPolicies();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Policies"
        description="Route policy targets and status"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {policies.map((policy) => (
          <SectionCard
            key={policy.routePolicy}
            title={policy.routePolicy}
            description={policyDescription(policy.routePolicy)}
            actions={
              <form action={togglePolicyAction}>
                <input name="routePolicy" type="hidden" value={policy.routePolicy} />
                <button
                  type="submit"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    policy.status === "ACTIVE"
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/20"
                      : policy.status === "DISABLED"
                        ? "border-slate-300/20 bg-slate-300/10 text-slate-200 hover:bg-slate-300/20"
                        : "border-white/8 bg-white/4 text-slate-400 hover:bg-white/8"
                  }`}
                >
                  {policy.status === "ACTIVE" ? "Active" : policy.status === "DISABLED" ? "Disabled" : "Using static"}
                </button>
              </form>
            }
          >
            {policy.targets.length === 0 ? (
              <EmptyState
                title="No custom targets"
                description="Using static catalog defaults."
              />
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <span className="flex-1">Provider</span>
                  <span className="flex-1">Model</span>
                </div>
                {policy.targets.map((target, index) => (
                  <div
                    key={`${target.provider}-${target.model}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-3 py-2"
                  >
                    <span className="flex-1 text-sm font-medium text-white">
                      {target.provider}
                    </span>
                    <span className="flex-1 text-sm text-slate-300">
                      {target.model}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

function policyDescription(policy: string) {
  const descriptions: Record<string, string> = {
    cheap: "Lowest cost provider priority",
    balanced: "Balanced cost vs quality",
    premium: "Highest quality provider priority",
    auto: "Automatic selection based on request"
  };
  return descriptions[policy] ?? "Custom routing policy";
}

async function togglePolicyAction(formData: FormData) {
  "use server";
  const { toggleRoutePolicyStatus } = await import("@/lib/internal/routing");
  const routePolicy = String(formData.get("routePolicy"));
  await toggleRoutePolicyStatus(routePolicy as any);
}
