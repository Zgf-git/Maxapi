import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { OnboardingStatusCard } from "@/components/onboarding/onboarding-status-card";
import { QuickstartExamples } from "@/components/onboarding/quickstart-examples";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/auth/session";
import { getOnboardingState } from "@/lib/onboarding/service";
import { PUBLIC_API_BASE_URL } from "@/lib/content/public-docs";

export default async function DashboardQuickstartPage() {
  const user = await requirePageUser();
  const onboardingState = await getOnboardingState(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        description="An authenticated quickstart focused on creating a key, sending one chat completion request, and confirming success in Requests."
        eyebrow="Activation"
        title="Dashboard quickstart"
      />

      <OnboardingStatusCard state={onboardingState} />
      <OnboardingChecklist state={onboardingState} />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>1. Create API key</CardTitle>
            <CardDescription>Generate a Bearer token from API Keys.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--color-muted-foreground)]">
            <p>Keys are shown once and then stored only as hashes.</p>
            <Button asChild variant={onboardingState.hasApiKey ? "secondary" : "default"}>
              <Link href="/dashboard/api-keys">{onboardingState.hasApiKey ? "Manage API keys" : "Create API key"}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Run request</CardTitle>
            <CardDescription>Use explicit model or route_policy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--color-muted-foreground)]">
            <p><span>Base URL: </span>{PUBLIC_API_BASE_URL}</p>
            <p>Header: `Authorization: Bearer YOUR_API_KEY`</p>
            <p>Endpoint: `POST /v1/chat/completions`</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Verify success</CardTitle>
            <CardDescription>Successful requests appear in observability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--color-muted-foreground)]">
            <p>After the first successful response, Requests will show provider/model routing, fallback, tokens, and cost.</p>
            <Button asChild variant="secondary">
              <Link href="/dashboard/requests">View requests</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Copy a working example</CardTitle>
          <CardDescription>Replace `YOUR_API_KEY` with your reveal-once key from API Keys.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuickstartExamples />
        </CardContent>
      </Card>

      {onboardingState.hasSuccessfulRequest ? (
        <Card className="border-emerald-300/20 bg-[linear-gradient(135deg,rgba(21,79,68,0.44),rgba(8,17,31,0.94))]">
          <CardHeader>
            <CardTitle>First request complete</CardTitle>
            <CardDescription>Your account has at least one successful chat completion request.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/requests">Inspect request logs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/pricing">Read pricing</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/docs">Open docs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
