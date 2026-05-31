import type { Metadata } from "next";

import { CodeTabs } from "@/components/docs/code-tabs";
import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export const metadata: Metadata = {
  title: "Embeddings API - MaxAPI",
  description: "Reference for MaxAPI embeddings, model discovery, and provider availability behavior."
};

const ENDPOINT = `${PUBLIC_API_BASE_URL}/v1/embeddings`;

export default function EmbeddingsPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Embeddings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Use one embeddings endpoint for semantic search, retrieval, clustering, and indexing workflows.
        </p>
      </section>

      <section className="glass-panel p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Endpoint</h2>
        <div className="rounded-2xl border border-white/8 bg-[#07111f] px-4 py-3">
          <code className="font-mono text-sm text-cyan-200">POST <span className="text-slate-100">{ENDPOINT}</span></code>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <CodeTabs
          examples={[
            {
              label: "Request",
              language: "json",
              code: `{
  "model": "text-embedding-3-small",
  "input": ["hello world", "semantic search"]
}`
            },
            {
              label: "Response",
              language: "json",
              code: `{
  "object": "list",
  "data": [
    { "object": "embedding", "index": 0, "embedding": [0.1, 0.2] }
  ],
  "model": "text-embedding-3-small",
  "usage": { "prompt_tokens": 8, "total_tokens": 8 }
}`
            }
          ]}
        />
      </section>

      <section className="glass-panel p-6">
        <h3 className="font-semibold text-white">Provider availability</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          OpenAI embeddings are confirmed in the public contract today. Aggregator-based embeddings should be treated as configuration-dependent until they are explicitly marked available in <code className="rounded-full border border-white/8 bg-white/6 px-2 py-1 text-xs text-slate-200">/v1/models</code>.
        </p>
      </section>
    </div>
  );
}
