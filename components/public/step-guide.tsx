"use client";

import { useState } from "react";
import { Check, Copy, FlaskConical, KeyRound, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: KeyRound,
    number: "01",
    title: "Create an API key",
    description: "Generate your API key in the dashboard and use it for applications, internal tools, or customer traffic."
  },
  {
    icon: FlaskConical,
    number: "02",
    title: "Update the base URL",
    description: "Point your existing OpenAI client to MaxAPI. In most cases, the integration change is only the endpoint and key."
  },
  {
    icon: Send,
    number: "03",
    title: "Start calling models",
    description: "Use explicit models or route policies to send traffic through one unified interface."
  }
];

const CODE_SNIPPET = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "YOUR_MAXAPI_KEY",
  baseURL: "https://your-domain.com/api/v1",
});

const response = await client.chat.completions.create({
  model: "gpt-5.4-mini",
  route_policy: "balanced",
  messages: [
    { role: "system", content: "You are a routing status assistant." },
    { role: "user", content: "Summarize the gateway health in one sentence." }
  ]
});

console.log(response.choices[0].message.content);`;

export function StepGuide() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-7">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Launch flow</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Three steps to get connected.</h2>
          <div className="mt-8 space-y-7">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-100">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{step.number}</span>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel overflow-hidden" data-no-translate>
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-slate-400 hover:text-white"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="overflow-x-auto p-5 text-sm leading-relaxed">
            <code className="text-slate-300">{CODE_SNIPPET}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
