import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Key, MousePointerClick, Send } from "lucide-react";

import { CodeTabs } from "@/components/docs/code-tabs";
import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export const metadata: Metadata = {
  title: "Quickstart - MaxAPI",
  description: "Connect to MaxAPI in minutes using the same OpenAI-compatible SDKs and request formats."
};

const STEPS = [
  {
    number: 1,
    title: "Create an account and API key",
    description: "Sign in, open the dashboard, and generate a MaxAPI key for your app or internal tools.",
    icon: Key,
    action: { label: "Open sign in", href: "/sign-in" }
  },
  {
    number: 2,
    title: "Point your SDK to MaxAPI",
    description: "Replace the base URL and API key. OpenAI SDK users usually only change one or two lines.",
    icon: MousePointerClick
  },
  {
    number: 3,
    title: "Send your first request",
    description: "Start with chat completions, then add embeddings and model discovery when your workflow needs them.",
    icon: Send
  }
];

const CODE_EXAMPLES = [
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
    route_policy="auto",
    messages=[{"role": "user", "content": "Hello"}]
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

const response = await client.chat.completions.create({
  model: "gpt-5.4-mini",
  route_policy: "balanced",
  messages: [{ role: "user", content: "Hello" }]
});

console.log(response.choices[0].message.content);`
  },
  {
    label: "cURL",
    language: "bash",
    code: `curl -X POST ${PUBLIC_API_BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.4-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'`
  }
];

export default function QuickstartPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Quickstart</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Move from direct provider traffic to MaxAPI with minimal code changes and a cleaner operator workflow.
        </p>
      </section>

      <section className="space-y-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="glass-panel flex gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/18 bg-cyan-300/10 text-cyan-100">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step {step.number}</span>
                  <h2 className="text-base font-semibold text-white">{step.title}</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                {step.action ? (
                  <Link className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-200 transition hover:text-cyan-100" href={step.action.href}>
                    {step.action.label}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <h2 className="mb-4 text-xl font-semibold text-white">Run your first request</h2>
        <CodeTabs examples={CODE_EXAMPLES} />
      </section>

      <section className="glass-panel p-6">
        <h2 className="font-semibold text-white">Next steps</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li><Link className="text-cyan-200 hover:text-cyan-100" href="/docs/api/chat-completions">Read the Chat Completions reference</Link></li>
          <li><Link className="text-cyan-200 hover:text-cyan-100" href="/docs/api/embeddings">Read the Embeddings reference</Link></li>
          <li><Link className="text-cyan-200 hover:text-cyan-100" href="/docs/models">Review supported models</Link></li>
          <li><Link className="text-cyan-200 hover:text-cyan-100" href="/docs/migration">Use the migration guide</Link></li>
        </ul>
      </section>
    </div>
  );
}
