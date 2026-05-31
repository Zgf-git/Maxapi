import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import DocsPage from "@/app/(public)/docs/page";
import PricingPage from "@/app/(public)/pricing/page";
import QuickstartPage from "@/app/(public)/docs/quickstart/page";
import SdksPage from "@/app/(public)/docs/sdks/page";
import ModelsPage from "@/app/(public)/models/page";
import DashboardModelsPage from "@/app/(dashboard)/dashboard/models/page";

vi.mock("@/lib/auth/session", () => ({
  requirePageUser: async () => ({
    id: "user_1",
    email: "admin@example.com"
  })
}));

describe("public catalog-driven pages", () => {
  it("renders pricing with policy and model sections", () => {
    const html = renderToStaticMarkup(<PricingPage />);

    expect(html).toContain("Plans");
    expect(html).toContain("Trial");
    expect(html).toContain("Builder");
    expect(html).toContain("Pro");
    expect(html).toContain("Enterprise");
    expect(html).toContain("usage remains balance-based");
    expect(html).toContain("gpt-4o");
    expect(html).toContain("GPT-4o Mini");
    expect(html).not.toContain("deepseek-chat");
    expect(html).not.toContain("usd-2026");
    expect(html).toContain("Price the gateway honestly, bill from actual usage.");
    expect(html).toContain("Model pricing");
    expect(html).toContain("Lowest cache-hit input per 1M tokens");
    expect(html).toContain("Pay as you go");
    expect(html).toContain("Current managed route defaults.");
  });

  it("renders docs and quickstart sections from the current catalog", () => {
    const docsHtml = renderToStaticMarkup(<DocsPage />);
    const quickstartHtml = renderToStaticMarkup(<QuickstartPage />);
    const sdksHtml = renderToStaticMarkup(<SdksPage />);

    expect(docsHtml).toContain("Build on one gateway, route across many upstreams.");
    expect(docsHtml).toContain("OpenAI-compatible surface");
    expect(docsHtml).toContain("Representative models already exposed.");
    expect(docsHtml).toContain("/v1/embeddings");
    expect(docsHtml).toContain("GPT-5.4");
    expect(docsHtml).toContain("GPT-5.4 Mini");

    expect(quickstartHtml).toContain("your-api-key");
    expect(quickstartHtml).toContain("route_policy");
    expect(quickstartHtml).toContain("auto");
    expect(quickstartHtml).toContain("model");
    expect(quickstartHtml).toContain("/v1");
    expect(sdksHtml).toContain("route_policy");
    expect(sdksHtml).not.toContain('model=&quot;balanced&quot;');
    expect(sdksHtml).not.toContain('model: &quot;cheap&quot;');
    expect(sdksHtml).not.toContain('&quot;model&quot;: &quot;premium&quot;');
  });

  it("renders public models page with policies, explicit models, and explainability copy", () => {
    const html = renderToStaticMarkup(<ModelsPage />);

    expect(html).toContain("Route policies");
    expect(html).toContain("Explicit models");
    expect(html).toContain("GPT-4o");
    expect(html).toContain("GPT-4o Mini");
    expect(html).toContain("GPT-5.4");
    expect(html).toContain("GPT-5.4 Mini");
    expect(html).not.toContain("deepseek-reasoner");
    expect(html).not.toContain("Internal reasoning-oriented fallback target");
  });

  it("renders dashboard models reference for authenticated users", async () => {
    const html = renderToStaticMarkup(await DashboardModelsPage());

    expect(html).toContain("Models and routing reference");
    expect(html).toContain("Open request history");
    expect(html).toContain("Open billing ledger");
    expect(html).toContain("Managed route policies");
    expect(html).toContain("Explicit public models");
  });
});
