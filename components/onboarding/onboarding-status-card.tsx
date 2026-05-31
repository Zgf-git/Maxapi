import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingState } from "@/lib/onboarding/types";

export function OnboardingStatusCard({ state }: { state: OnboardingState }) {
  if (state.milestone === "first_request_complete") {
    return (
      <Card className="border-emerald-300/20 bg-[linear-gradient(135deg,rgba(21,79,68,0.44),rgba(8,17,31,0.94))]">
        <CardHeader>
          <CardTitle>Your first request succeeded</CardTitle>
          <CardDescription>MaxAPI has seen a successful chat completion request for this account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-emerald-100/90">
            You can now inspect routing outcomes, fallback behavior, and usage metadata in Requests.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/requests">View requests</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/api-keys">Manage API keys</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.milestone === "api_key_created_no_successful_request") {
    return (
      <Card className="border-[var(--color-primary)]/18 bg-[linear-gradient(135deg,rgba(28,73,88,0.34),rgba(8,17,31,0.94)_34%,rgba(22,38,68,0.78))]">
        <CardHeader>
          <CardTitle>Make your first API request</CardTitle>
          <CardDescription>You have an API key. The next activation step is sending a successful chat completion request.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Use the dashboard quickstart for copyable examples, then verify the result in Requests.
          </p>
          <Button asChild>
            <Link href="/dashboard/quickstart">Open dashboard quickstart</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="border-[var(--color-primary)]/18 bg-[linear-gradient(135deg,rgba(28,73,88,0.34),rgba(8,17,31,0.94)_34%,rgba(22,38,68,0.78))]">
      <CardHeader>
        <CardTitle>Create your first API key</CardTitle>
        <CardDescription>Start by creating a credential for the OpenAI-compatible API.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          API keys are shown once, hashed at rest, and can be revoked from the dashboard.
        </p>
        <Button asChild>
          <Link href="/dashboard/api-keys">Create API key</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
