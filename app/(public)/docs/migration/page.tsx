import type { Metadata } from "next";

import { CheckCircle } from "lucide-react";
import { CodeTabs } from "@/components/docs/code-tabs";

export const metadata: Metadata = {
  title: "Migrate from OpenAI - MaxAPI",
  description: "Move from direct OpenAI traffic to MaxAPI by changing the base URL and API key, without rewriting your SDK usage."
};

const BEFORE_AFTER = {
  label: "Before / After",
  language: "python",
  code: `# Before (OpenAI)
from openai import OpenAI

client = OpenAI(
    base_url="https://api.openai.com/v1",
    api_key="sk-openai-xxx"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}]
)

# After (MaxAPI)
from openai import OpenAI

client = OpenAI(
    base_url="https://your-maxapi-domain.com/v1",
    api_key="mk_live_xxx"
)

response = client.chat.completions.create(
    model="gpt-5.4-mini",
    route_policy="balanced",
    messages=[{"role": "user", "content": "Hello"}]
)`
};

const STEPS = [
  "Install or keep the OpenAI SDK.",
  "Replace the base URL with your MaxAPI endpoint.",
  "Replace the API key with a MaxAPI key from the dashboard.",
  "Choose either explicit public models or route policies.",
  "Use MaxAPI logs, billing, and provider operations instead of debugging each upstream separately."
];

export default function MigrationPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Migrate from OpenAI</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          The public contract stays familiar while routing, fallback, billing, and provider management move behind MaxAPI.
        </p>
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-semibold text-white">Before and after</h2>
        <CodeTabs examples={[BEFORE_AFTER]} />
      </section>

      <section className="glass-panel p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Migration steps</h2>
        <div className="space-y-3">
          {STEPS.map((step) => (
            <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <span className="text-sm leading-6 text-slate-300">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h3 className="font-semibold text-white">Why teams move traffic behind MaxAPI</h3>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-slate-400">
          <li>Keep OpenAI SDK compatibility while centralizing billing, fallback, and operator controls.</li>
          <li>Move away from a single upstream dependency without rebuilding every client.</li>
          <li>Make route policy changes server-side instead of shipping app updates.</li>
          <li>Get request logs and balance-backed billing from the same control plane.</li>
        </ul>
      </section>
    </div>
  );
}
