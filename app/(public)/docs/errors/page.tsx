import type { Metadata } from "next";

import { PUBLIC_ERROR_GUIDE } from "@/lib/content/public-docs";

export const metadata: Metadata = {
  title: "Error Codes - MaxAPI",
  description: "Reference for MaxAPI error codes, HTTP mappings, and suggested operator actions."
};

export default function ErrorsPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel p-7 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Error codes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          MaxAPI errors return JSON payloads with code, message, and type fields. Use this page to map failures to the right operational response.
        </p>
      </section>

      <div className="grid gap-4">
        {PUBLIC_ERROR_GUIDE.map((item) => (
          <div key={item.code} className="glass-panel p-5 transition hover:-translate-y-0.5">
            <code className="rounded-2xl border border-white/8 bg-[#07111f] px-3 py-1.5 text-sm font-semibold text-cyan-200">
              {item.code}
            </code>
            <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>

      <section className="glass-panel p-6">
        <h3 className="font-semibold text-white">HTTP status mapping</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li><strong className="text-slate-100">400</strong> Invalid request shape or missing required fields.</li>
          <li><strong className="text-slate-100">401</strong> Missing or invalid API key.</li>
          <li><strong className="text-slate-100">402</strong> Insufficient balance.</li>
          <li><strong className="text-slate-100">403</strong> Revoked, disabled, or expired access.</li>
          <li><strong className="text-slate-100">429</strong> Rate limit exceeded.</li>
          <li><strong className="text-slate-100">502</strong> Upstream provider error.</li>
        </ul>
      </section>
    </div>
  );
}
