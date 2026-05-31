import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { OnboardingStatusCard } from "@/components/onboarding/onboarding-status-card";
import { QuickstartExamples } from "@/components/onboarding/quickstart-examples";
import { deriveOnboardingState } from "@/lib/onboarding/service";

describe("onboarding state", () => {
  it("derives no-key state", () => {
    expect(deriveOnboardingState({ apiKeyCount: 0, successfulRequestCount: 0 })).toMatchObject({
      milestone: "no_api_key",
      hasApiKey: false,
      hasSuccessfulRequest: false
    });
  });

  it("derives key-created state before successful request", () => {
    expect(deriveOnboardingState({ apiKeyCount: 1, successfulRequestCount: 0 })).toMatchObject({
      milestone: "api_key_created_no_successful_request",
      hasApiKey: true,
      hasSuccessfulRequest: false
    });
  });

  it("derives completed state after a successful request", () => {
    expect(deriveOnboardingState({ apiKeyCount: 1, successfulRequestCount: 1 })).toMatchObject({
      milestone: "first_request_complete",
      hasApiKey: true,
      hasSuccessfulRequest: true
    });
  });
});

describe("onboarding components", () => {
  it("renders create-key CTA when no API key exists", () => {
    const html = renderToStaticMarkup(<OnboardingStatusCard state={deriveOnboardingState({ apiKeyCount: 0, successfulRequestCount: 0 })} />);

    expect(html).toContain("Create your first API key");
    expect(html).toContain("/dashboard/api-keys");
  });

  it("renders quickstart CTA when a key exists but no request succeeded", () => {
    const html = renderToStaticMarkup(<OnboardingStatusCard state={deriveOnboardingState({ apiKeyCount: 1, successfulRequestCount: 0 })} />);

    expect(html).toContain("Make your first API request");
    expect(html).toContain("/dashboard/quickstart");
  });

  it("renders completion state after first successful request", () => {
    const html = renderToStaticMarkup(<OnboardingStatusCard state={deriveOnboardingState({ apiKeyCount: 1, successfulRequestCount: 1 })} />);

    expect(html).toContain("Your first request succeeded");
    expect(html).toContain("/dashboard/requests");
  });

  it("renders checklist progress and placeholder examples without a raw key", () => {
    const state = deriveOnboardingState({ apiKeyCount: 1, successfulRequestCount: 0 });
    const checklistHtml = renderToStaticMarkup(<OnboardingChecklist state={state} />);
    const examplesHtml = renderToStaticMarkup(<QuickstartExamples />);

    expect(checklistHtml).toContain("Activation checklist");
    expect(checklistHtml).toContain("Ready");
    expect(checklistHtml).not.toContain("Copy example</p><span class=\"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700\">Done");
    expect(examplesHtml).toContain("YOUR_API_KEY");
    expect(examplesHtml).not.toContain("mk_live_secret_value");
  });
});
