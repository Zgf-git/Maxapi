import type { Metadata } from "next";

import { CodeTabs } from "@/components/docs/code-tabs";
import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export const metadata: Metadata = {
  title: "SDKs and Examples - MaxAPI",
  description: "SDK examples for Python, Node.js, and cURL with MaxAPI's OpenAI-compatible gateway."
};

const PYTHON_EXAMPLE = {
  label: "Python",
  language: "python",
  code: `from openai import OpenAI

client = OpenAI(
    base_url="${PUBLIC_API_BASE_URL}/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="gpt-5.4-mini",
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.choices[0].message.content)

stream = client.chat.completions.create(
    route_policy="balanced",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)`
};

const NODE_EXAMPLE = {
  label: "Node.js",
  language: "javascript",
  code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${PUBLIC_API_BASE_URL}/v1",
  apiKey: "your-api-key"
});

const response = await client.chat.completions.create({
  model: "gpt-5.4-mini",
  messages: [{ role: "user", content: "Hello" }]
});

const stream = await client.chat.completions.create({
  route_policy: "cheap",
  messages: [{ role: "user", content: "Hello" }],
  stream: true
});`
};

const CURL_EXAMPLE = {
  label: "cURL",
  language: "bash",
  code: `curl -X POST ${PUBLIC_API_BASE_URL}/v1/chat/completions \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "route_policy": "premium",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'`
};

export default function SdksPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">SDKs and examples</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Keep the same client libraries and request shape while pointing traffic at MaxAPI.
        </p>
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-semibold text-white">Python</h2>
        <CodeTabs examples={[PYTHON_EXAMPLE]} />
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-semibold text-white">Node.js</h2>
        <CodeTabs examples={[NODE_EXAMPLE]} />
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-semibold text-white">cURL</h2>
        <CodeTabs examples={[CURL_EXAMPLE]} />
      </section>
    </div>
  );
}
