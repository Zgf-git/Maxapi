import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingState } from "@/lib/onboarding/types";

const STEPS = [
  {
    id: "api-key",
    title: "Create API key",
    description: "Generate a dashboard-managed Bearer token for the external API."
  },
  {
    id: "copy-example",
    title: "Copy example",
    description: "Choose explicit model or route_policy and paste the request into your terminal."
  },
  {
    id: "first-request",
    title: "Make first request",
    description: "Send POST /v1/chat/completions with OpenAI-style messages."
  },
  {
    id: "verify",
    title: "Verify success",
    description: "Confirm the request in the Requests dashboard."
  }
] as const;

function getStepBadge(stepId: (typeof STEPS)[number]["id"], state: OnboardingState) {
  if (stepId === "api-key") {
    return state.hasApiKey ? "Done" : "Next";
  }

  if (stepId === "copy-example") {
    if (state.hasSuccessfulRequest) {
      return "Done";
    }

    return state.hasApiKey ? "Ready" : "Locked";
  }

  if (state.hasSuccessfulRequest) {
    return "Done";
  }

  return state.hasApiKey ? "Next" : "Locked";
}

function isStepComplete(stepId: (typeof STEPS)[number]["id"], state: OnboardingState) {
  if (stepId === "api-key") {
    return state.hasApiKey;
  }

  return state.hasSuccessfulRequest;
}

export function OnboardingChecklist({ state }: { state: OnboardingState }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activation checklist</CardTitle>
        <CardDescription>Progress is derived from your API keys and successful request logs.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {STEPS.map((step) => {
          const complete = isStepComplete(step.id, state);
          const badge = getStepBadge(step.id, state);

          return (
            <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" key={step.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{step.title}</p>
                <Badge variant={complete ? "success" : "muted"}>{badge}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{step.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
