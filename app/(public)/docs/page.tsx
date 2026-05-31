import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Globe2, Layers3, ShieldCheck, Sparkles } from "lucide-react";

import { CodeTabs } from "@/components/docs/code-tabs";
import { getPublicCatalogModels } from "@/lib/catalog";
import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export const metadata: Metadata = {
  title: "Docs - MaxAPI",
  description:
    "Official MaxAPI docs for OpenAI-compatible chat, embeddings, model discovery, routing, billing, and upstream failover."
};

const SDK_EXAMPLES = [
  {
    label: "Python",
    language: "python",
    code: `from openai import OpenAI

client = OpenAI(
    base_url="${PUBLIC_API_BASE_URL}/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Summarize today's routing health."}]
)
print(response.choices[0].message.content)`
  },
  {
    label: "Node.js",
    language: "javascript",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${PUBLIC_API_BASE_URL}/v1",
  apiKey: "your-api-key"
});

const response = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: "Gateway operators need reliable cost tracking."
});

console.log(response.data[0].embedding.length);`
  },
  {
    label: "cURL",
    language: "bash",
    code: `curl ${PUBLIC_API_BASE_URL}/v1/models \\
  -H "Authorization: Bearer your-api-key"`
  }
];

const FEATURE_CARDS = [
  {
    icon: Layers3,
    title: "OpenAI-compatible surface",
    description: "Keep one base URL while MaxAPI routes across upstream providers, plans, and fallback chains."
  },
  {
    icon: ShieldCheck,
    title: "Operator-grade controls",
    description: "Per-key limits, balance billing, audit logs, pending usage resolution, and resilient stream handling."
  },
  {
    icon: Sparkles,
    title: "Commercial gateway workflow",
    description: "Models, pricing, request logs, provider health, and billing states stay visible to both users and operators."
  },
  {
    icon: Globe2,
    title: "Multi-provider ready",
    description: "OpenAI and APIMart can coexist now, and the registry stays open for more OpenAI-compatible suppliers later."
  }
];

export default function DocsPage() {
  const models = getPublicCatalogModels().slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="glass-panel overflow-hidden p-8 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,231,196,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(112,164,255,0.2),transparent_42%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              MaxAPI Documentation
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Build on one gateway, route across many upstreams.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                MaxAPI keeps the public contract simple while your routing, fallback, billing, and provider operations stay server-side.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-5 py-3 text-sm font-semibold text-slate-950"
                href="/docs/quickstart"
              >
                Start in 3 minutes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/docs/api/chat-completions"
              >
                API reference
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              ["Endpoints", "Chat, embeddings, models"],
              ["Fallback", "Multi-step route recovery"],
              ["Billing", "Usage ledger plus balance journal"],
              ["Providers", "OpenAI and APIMart ready"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-white/10 bg-[#0b1627]/78 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-medium text-slate-100">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Quickstart</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Use the same SDKs, point them at MaxAPI.</h2>
          </div>
          <Link className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100" href="/docs/quickstart">
            See full setup
          </Link>
        </div>
        <CodeTabs examples={SDK_EXAMPLES} />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {FEATURE_CARDS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="glass-panel p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/16 bg-cyan-300/10 text-cyan-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel p-6 sm:p-7">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Core endpoints</p>
          <div className="mt-5 space-y-4">
            {[
              ["POST", "/v1/chat/completions", "Chat completions with route policies or explicit models."],
              ["POST", "/v1/completions", "Legacy text completions compatibility."],
              ["POST", "/v1/embeddings", "Unified embeddings billing and request tracing."],
              ["GET", "/v1/models", "Model catalog and provider availability."]
            ].map(([method, path, description]) => (
              <div key={path} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-cyan-300/16 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
                    {method}
                  </span>
                  <code className="text-sm text-white">{path}</code>
                </div>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Public models</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Representative models already exposed.</h2>
            </div>
            <Link className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100" href="/docs/models">
              Full list
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {models.map((model) => (
              <div key={model.id} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{model.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{model.provider}</p>
                  </div>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-3 text-sm text-slate-400">{model.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
