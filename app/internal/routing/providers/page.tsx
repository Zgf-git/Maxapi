import Link from "next/link";

import { EmptyState } from "@/components/internal/ui/empty-state";
import { PageHeader } from "@/components/internal/ui/page-header";
import { SectionCard } from "@/components/internal/ui/section-card";
import { listRoutingProviders } from "@/lib/internal/routing";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Upstreams · Routing · Internal · MaxAPI"
};

export default async function InternalProvidersPage() {
  const providers = await listRoutingProviders();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Upstreams"
        description={`${providers.length} providers · ${providers.reduce((sum, p) => sum + p.upstreamKeys.length, 0)} keys`}
      />

      <div className="space-y-4">
        {providers.map((provider) => (
          <SectionCard
            key={provider.slug}
            title={provider.label}
            description={`${provider.slug} · ${provider.baseUrl} · ${provider.status}`}
            actions={
              <div className="flex gap-2">
                {provider.supportsChat && (
                  <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs text-slate-300">
                    Chat
                  </span>
                )}
                {provider.supportsEmbeddings && (
                  <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs text-slate-300">
                    Embeddings
                  </span>
                )}
                {provider.supportsRerank && (
                  <span className="rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-xs text-slate-300">
                    Rerank
                  </span>
                )}
              </div>
            }
          >
            <div className="text-xs text-slate-500">
              Test model: {provider.testModel}
            </div>

            {provider.upstreamKeys.length === 0 ? (
              <EmptyState
                title="No keys"
                description="Env fallback still works if configured."
              />
            ) : (
              <div className="mt-3 space-y-2">
                {provider.upstreamKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/4 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {key.displayName}
                        </span>
                        <StatusBadge status={key.status} />
                        {key.baseUrlOverride && (
                          <span className="text-[10px] text-slate-500">
                            override
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {key.keyPrefix}••••{key.lastFour} · priority {key.priority}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                        {key.quotaLimitUsdMicros ? (
                          <span>
                            Quota: {(Number(key.quotaUsedUsdMicros) / 1_000_000).toFixed(2)} /{" "}
                            {(Number(key.quotaLimitUsdMicros) / 1_000_000).toFixed(2)} USD
                          </span>
                        ) : null}
                        {key.dailyLimitRequests ? (
                          <span>
                            Daily: {key.dailyUsedRequests} / {key.dailyLimitRequests}
                          </span>
                        ) : null}
                        {key.errorCount > 0 ? (
                          <span className="text-rose-300">
                            Errors: {key.errorCount}
                          </span>
                        ) : null}
                        {key.lastTestedAt ? (
                          <span>
                            Tested: {formatDateTime(key.lastTestedAt)}
                          </span>
                        ) : (
                          <span>Never tested</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <form action={toggleKeyAction}>
                        <input name="keyId" type="hidden" value={key.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/8 hover:text-white"
                        >
                          {key.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </div>
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

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
        active
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
          : "border-slate-300/20 bg-slate-300/10 text-slate-200"
      }`}
    >
      {status}
    </span>
  );
}

async function toggleKeyAction(formData: FormData) {
  "use server";
  const { toggleUpstreamKeyStatus } = await import("@/lib/internal/routing");
  const keyId = String(formData.get("keyId"));
  await toggleUpstreamKeyStatus(keyId);
}
