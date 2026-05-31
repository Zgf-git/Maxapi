"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { runPlaygroundAction } from "@/components/playground/actions";
import { CodeBlock } from "@/components/shared/code-block";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogExplicitModelEntry, CatalogPolicyEntry } from "@/lib/catalog/types";
import type { PlaygroundActionResult, PlaygroundPayload } from "@/lib/playground/types";
import { formatDateTime, formatUsdMicros, formatWholeNumber } from "@/lib/utils";

type Mode = "model" | "route_policy";

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function buildCurl(payload: PlaygroundPayload) {
  return `curl https://your-maxapi-domain.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  --data-binary @- <<'JSON'
${JSON.stringify(payload, null, 2)}
JSON`;
}

function parseOptionalNumber(value: string) {
  return value.trim() === "" ? undefined : Number(value);
}

export function PlaygroundClient({
  defaultModelId,
  defaultRoutePolicy,
  hasActiveApiKey,
  models,
  planLabel,
  policies
}: {
  defaultModelId: string;
  defaultRoutePolicy: PlaygroundPayload["route_policy"];
  hasActiveApiKey: boolean;
  models: CatalogExplicitModelEntry[];
  planLabel: string;
  policies: CatalogPolicyEntry[];
}) {
  const [mode, setMode] = useState<Mode>("route_policy");
  const [model, setModel] = useState(defaultModelId);
  const [routePolicy, setRoutePolicy] = useState<PlaygroundPayload["route_policy"]>(defaultRoutePolicy);
  const [systemPrompt, setSystemPrompt] = useState("You are a concise assistant for API debugging.");
  const [userMessage, setUserMessage] = useState("Say hello in one sentence and mention which route handled you if available.");
  const [temperature, setTemperature] = useState("0.7");
  const [topP, setTopP] = useState("");
  const [maxTokens, setMaxTokens] = useState("256");
  const [stream, setStream] = useState(false);
  const [result, setResult] = useState<PlaygroundActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const payload = useMemo<PlaygroundPayload>(() => {
    const messages: PlaygroundPayload["messages"] = [];

    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() });
    }

    messages.push({ role: "user", content: userMessage.trim() || "Hello" });

    return {
      ...(mode === "model" ? { model } : { route_policy: routePolicy }),
      messages,
      temperature: parseOptionalNumber(temperature),
      top_p: parseOptionalNumber(topP),
      max_tokens: parseOptionalNumber(maxTokens),
      stream
    };
  }, [maxTokens, mode, model, routePolicy, stream, systemPrompt, temperature, topP, userMessage]);

  function runRequest() {
    startTransition(async () => {
      setResult(await runPlaygroundAction(payload));
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Request builder</CardTitle>
          <CardDescription>
            <span>Runs through the same validation, routing, billing, logging, abuse controls, and </span>{planLabel}<span> plan entitlements as `/v1/chat/completions`.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!hasActiveApiKey ? (
            <div className="rounded-2xl border border-amber-300/24 bg-amber-300/8 p-4 text-sm text-amber-100">
              Create an active API key before running playground requests. The key is used server-side for attribution only and is never shown here.
              <div className="mt-3">
                <Link className="font-medium underline-offset-2 hover:underline" href="/dashboard/api-keys">
                  Create API Key
                </Link>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className={`rounded-2xl border p-4 text-left text-sm transition ${
                mode === "route_policy"
                  ? "border-cyan-300/30 bg-cyan-300/10 text-slate-50"
                  : "border-white/10 bg-[#0b1626] text-slate-200 hover:bg-[#102034]"
              }`}
              onClick={() => setMode("route_policy")}
              type="button"
            >
              <span className="font-medium">Route policy</span>
              <span className="mt-1 block text-slate-400">Let server-side routing choose a provider/model.</span>
            </button>
            <button
              className={`rounded-2xl border p-4 text-left text-sm transition ${
                mode === "model"
                  ? "border-cyan-300/30 bg-cyan-300/10 text-slate-50"
                  : "border-white/10 bg-[#0b1626] text-slate-200 hover:bg-[#102034]"
              }`}
              onClick={() => setMode("model")}
              type="button"
            >
              <span className="font-medium">Explicit model</span>
              <span className="mt-1 block text-slate-400">Request one supported public model directly.</span>
            </button>
          </div>

          {mode === "route_policy" ? (
            <div className="space-y-2">
              <Label htmlFor="route-policy">Route policy</Label>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#0b1626] px-3 text-sm text-slate-100"
                id="route-policy"
                onChange={(event) => setRoutePolicy(event.target.value as PlaygroundPayload["route_policy"])}
                value={routePolicy}
              >
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.routePolicy}>
                    {policy.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <select
                className="h-11 w-full rounded-2xl border border-white/10 bg-[#0b1626] px-3 text-sm text-slate-100"
                id="model"
                onChange={(event) => setModel(event.target.value)}
                value={model}
              >
                {models.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label} ({entry.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="system">System message</Label>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-white/10 bg-[#0b1626] p-3 text-sm text-slate-100"
              id="system"
              onChange={(event) => setSystemPrompt(event.target.value)}
              value={systemPrompt}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-message">User message</Label>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-white/10 bg-[#0b1626] p-3 text-sm text-slate-100"
              id="user-message"
              onChange={(event) => setUserMessage(event.target.value)}
              value={userMessage}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" inputMode="decimal" onChange={(event) => setTemperature(event.target.value)} value={temperature} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="top-p">Top P</Label>
              <Input id="top-p" inputMode="decimal" onChange={(event) => setTopP(event.target.value)} placeholder="optional" value={topP} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max tokens</Label>
              <Input id="max-tokens" inputMode="numeric" onChange={(event) => setMaxTokens(event.target.value)} value={maxTokens} />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0b1626] p-4 text-sm text-slate-200">
            <input
              checked={stream}
              className="mt-1"
              onChange={(event) => setStream(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="font-medium">Test streaming request shape</span>
              <span className="block text-slate-400">
                The dashboard runner currently executes non-streaming calls only. If enabled, the server returns a safe validation error instead of faking stream playback.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-3">
            <Button disabled={!hasActiveApiKey || isPending} onClick={runRequest} type="button">
              {isPending ? "Running..." : "Run request"}
            </Button>
            <Button onClick={() => setResult(null)} type="button" variant="outline">
              Clear result
            </Button>
          </div>

          <CodeBlock code={prettyJson(payload)} language="json" title="Sanitized request payload" />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Execution result</CardTitle>
            <CardDescription>
              Actual provider/model, billing metadata, and request-log linkage appear after a run completes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!result ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-slate-400">
                Run a request to inspect the assistant response, route outcome, usage, cost, and request log.
              </div>
            ) : result.ok ? (
              <>
                <div className="rounded-2xl bg-stone-950 p-5 text-sm leading-7 text-stone-50">
                  {result.assistantText || "No assistant response returned."}
                </div>
                <ResultMetadata result={result} />
                <div className="grid gap-4">
                  <CodeBlock code={prettyJson(result.responsePayload)} language="json" title="Sanitized response payload" />
                  <CodeBlock code={buildCurl(result.requestPayload)} language="bash" title="Equivalent curl with placeholder key" />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-950">
                  <p className="font-medium">{result.code}</p>
                  <p className="mt-1">{result.message}</p>
                </div>
                {result.detail ? <FailureMetadata result={result} /> : null}
                <CodeBlock code={prettyJson(result.requestPayload ?? payload)} language="json" title="Failed request payload" />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultMetadata({ result }: { result: Extract<PlaygroundActionResult, { ok: true }> }) {
  const detail = result.detail;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Meta label="Requested policy" value={detail.requestedRoutePolicy ?? "—"} />
      <Meta label="Requested model" value={detail.requestedModel ?? "—"} />
      <Meta label="Actual provider" value={detail.actualProvider} />
      <Meta label="Actual model" value={detail.actualUpstreamModel ?? "—"} />
      <Meta label="Fallback" value={detail.fallbackUsed ? "Used" : "Not used"} />
      <Meta label="Latency" value={detail.latencyMs === null ? "—" : `${detail.latencyMs} ms`} />
      <Meta label="Total tokens" value={formatWholeNumber(detail.totalTokens)} />
      <Meta label="Total cost" value={formatUsdMicros(detail.totalCostUsdMicros ? BigInt(detail.totalCostUsdMicros) : null)} />
      <Meta label="Ledger status" value={detail.ledgerStatus ?? "—"} />
      <Meta label="Created at" value={formatDateTime(new Date(detail.createdAt))} />
      <div className="rounded-2xl border border-white/10 bg-[#0b1626] p-4 text-sm text-slate-100 md:col-span-2">
        <p className="text-slate-400">Request log</p>
        <Link className="mt-1 inline-block font-medium underline-offset-2 hover:underline" href={`/dashboard/requests/${detail.requestLogId}`}>
          <span>Open request </span>{detail.requestLogId}
        </Link>
      </div>
    </div>
  );
}

function FailureMetadata({ result }: { result: Extract<PlaygroundActionResult, { ok: false }> }) {
  const detail = result.detail;

  if (!detail) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Meta label="Request log" value={detail.requestLogId} />
      <Meta label="Status" value={detail.status} />
      <Meta label="Actual provider" value={detail.actualProvider} />
      <Meta label="Actual model" value={detail.actualUpstreamModel ?? "—"} />
      <Meta label="Error code" value={detail.errorCode ?? result.code} />
      <Meta label="Error message" value={detail.errorMessage ?? result.message} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1626] p-4 text-sm text-slate-100">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
