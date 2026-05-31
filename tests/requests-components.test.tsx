import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestFilters } from "@/components/requests/request-filters";
import { RequestsTable } from "@/components/requests/requests-table";
import type { ObservabilityRow } from "@/lib/observability/types";

const rows: ObservabilityRow[] = [
  {
    id: "req_1",
    createdAt: new Date("2026-04-18T00:00:00Z"),
    requestType: "CHAT_COMPLETION",
    requestedRoutePolicy: "balanced",
    requestedModel: null,
    actualProvider: "openai",
    actualUpstreamModel: "gpt-4o",
    fallbackUsed: true,
    fallbackFromProvider: "openai",
    fallbackFromModel: "gpt-4o-mini",
    routeReason: "route_policy:balanced:fallback_retryable_upstream",
    status: "SUCCESS",
    latencyMs: 220,
    totalTokens: 140,
    totalCostUsdMicros: 1000n,
    errorCode: null,
    errorMessage: null
  }
];

describe("requests dashboard components", () => {
  it("renders filter links with the current server-side query state", () => {
    const html = renderToStaticMarkup(<RequestFilters filters={{ provider: "openai", status: "SUCCESS" }} />);

    expect(html).toContain("/dashboard/requests?provider=openai&amp;status=SUCCESS");
    expect(html).toContain("Fallback");
  });

  it("renders table badges and avoids exposing sensitive key fields", () => {
    const html = renderToStaticMarkup(<RequestsTable rows={rows} />);

    expect(html).toContain("Used");
    expect(html).toContain("Success");
    expect(html).toContain("gpt-4o");
    expect(html).not.toContain("apiKeyId");
    expect(html).not.toContain("keyHash");
    expect(html).not.toContain("Authorization");
  });

  it("renders a compact sanitized error summary when a message is available", () => {
    const html = renderToStaticMarkup(
      <RequestsTable
        rows={[
          {
            ...rows[0],
            errorCode: "upstream_error",
            errorMessage: "Upstream provider error that is already sanitized for the dashboard."
          }
        ]}
      />
    );

    expect(html).toContain("upstream_error");
    expect(html).toContain("sanitized");
  });

  it("renders a truthful empty state when there are no rows", () => {
    const html = renderToStaticMarkup(<RequestsTable rows={[]} />);

    expect(html).toContain("No requests found");
    expect(html).toContain("Open dashboard quickstart");
    expect(html).toContain("/dashboard/quickstart");
  });
});
