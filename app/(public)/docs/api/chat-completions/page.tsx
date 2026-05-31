import type { Metadata } from "next";

import { CodeTabs } from "@/components/docs/code-tabs";
import { getCatalogPolicyEntries } from "@/lib/catalog";
import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export const metadata: Metadata = {
  title: "Chat Completions API - MaxAPI",
  description: "Reference for MaxAPI chat completions, including route policies, streaming, and OpenAI-compatible request bodies."
};

const ENDPOINT = `${PUBLIC_API_BASE_URL}/v1/chat/completions`;

const REQUEST_EXAMPLE = {
  label: "Request",
  language: "json",
  code: `{
  "model": "gpt-5.4-mini",
  "route_policy": "balanced",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}`
};

const RESPONSE_EXAMPLE = {
  label: "Response",
  language: "json",
  code: `{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "gpt-5.4-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}`
};

const PARAMETERS = [
  { name: "model", type: "string", required: true, description: "Public model id such as gpt-5.4, gpt-4o-mini, or deepseek-v3.1." },
  { name: "route_policy", type: "string", required: false, description: "Managed routing policy: cheap, balanced, premium, or auto." },
  { name: "messages", type: "array", required: true, description: "OpenAI-style chat messages with role and content." },
  { name: "temperature", type: "number", required: false, description: "Sampling temperature from 0 to 2." },
  { name: "max_tokens", type: "integer", required: false, description: "Upper bound for generated completion tokens." },
  { name: "top_p", type: "number", required: false, description: "Nucleus sampling threshold." },
  { name: "stream", type: "boolean", required: false, description: "Enable SSE streaming responses." },
  { name: "stop", type: "string | string[]", required: false, description: "Optional stop sequence or list of stop sequences." },
  { name: "tools", type: "array", required: false, description: "Tool definitions for function calling." },
  { name: "tool_choice", type: "string | object", required: false, description: "Controls whether and how tools are called." }
];

const ROUTE_POLICIES = getCatalogPolicyEntries();

export default function ChatCompletionsPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Chat Completions</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Create chat completions with explicit models or managed route policies. The public request shape stays OpenAI-compatible while routing remains server-side.
        </p>
      </section>

      <section className="glass-panel p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Endpoint</h2>
        <div className="rounded-2xl border border-white/8 bg-[#07111f] px-4 py-3">
          <code className="font-mono text-sm text-cyan-200">POST <span className="text-slate-100">{ENDPOINT}</span></code>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Authentication</h2>
        <p className="text-sm text-slate-400">Send your MaxAPI key as a Bearer token.</p>
        <div className="mt-3 rounded-2xl border border-white/8 bg-[#07111f] px-4 py-3">
          <code className="font-mono text-sm text-slate-100">Authorization: Bearer &lt;your-api-key&gt;</code>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-7">
        <h2 className="mb-4 text-lg font-semibold text-white">Examples</h2>
        <CodeTabs examples={[REQUEST_EXAMPLE, RESPONSE_EXAMPLE]} />
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="border-b border-white/8 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">Request parameters</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Field</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Required</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {PARAMETERS.map((param) => (
                <tr key={param.name} className="hover:bg-white/4">
                  <td className="px-4 py-3 font-mono text-cyan-200">{param.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{param.type}</td>
                  <td className="px-4 py-3 text-slate-300">{param.required ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-slate-400">{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h3 className="font-semibold text-white">Managed route chains</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          {ROUTE_POLICIES.map((policy) => (
            <li key={policy.routePolicy}>
              <strong className="text-slate-100">{policy.routePolicy}</strong>:{" "}
              <code className="text-slate-300">{policy.targets.map((target) => target.model).join(" -> ")}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
