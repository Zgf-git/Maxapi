"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Sparkles } from "lucide-react";

import { createApiKeyAction } from "@/components/dashboard/api-key-actions";
import { QuickstartExamples } from "@/components/onboarding/quickstart-examples";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RevealState = {
  plaintextKey: string;
  keyPrefix: string;
  lastFour: string;
};

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<RevealState | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createApiKeyAction(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setReveal({
        plaintextKey: result.plaintextKey,
        keyPrefix: result.keyPrefix,
        lastFour: result.lastFour
      });
    });
  }

  async function copyKey() {
    if (!reveal) {
      return;
    }

    await navigator.clipboard.writeText(reveal.plaintextKey);
  }

  function resetState(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setError(null);
      setReveal(null);
    }
  }

  return (
    <Dialog onOpenChange={resetState} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" />
          Create API key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:w-[min(92vw,52rem)]">
        <DialogHeader>
          <DialogTitle>{reveal ? "Copy your new key now" : "Create a new API key"}</DialogTitle>
          <DialogDescription>
            {reveal
              ? "This is the only time the full key will be visible. Store it securely before closing."
              : "Create a scoped credential for future API access. The plaintext value is never stored."}
          </DialogDescription>
        </DialogHeader>

        {reveal ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-300/22 bg-emerald-300/8 p-4 text-sm text-emerald-100">
              <p className="font-medium">API key created</p>
              <p className="mt-1">Copy the key now, then paste it into the examples below to create your first request log.</p>
            </div>
            <div className="rounded-3xl border bg-stone-950 p-4 text-stone-50">
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-stone-400">Reveal once</p>
              <p className="break-all font-mono text-sm">{reveal.plaintextKey}</p>
            </div>
            <div className="rounded-3xl bg-[var(--color-secondary)]/70 p-4 text-sm text-slate-300">
              <p><span>Prefix: </span>{reveal.keyPrefix}</p>
              <p><span>Masked suffix for later listings: </span>••••{reveal.lastFour}</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Next step: make a first request</p>
              <QuickstartExamples />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Examples use `YOUR_API_KEY` so the raw key stays confined to the reveal-once field above.
              </p>
            </div>
            <DialogFooter className="justify-between">
              <Button onClick={copyKey} type="button" variant="secondary">
                <Copy className="mr-2 h-4 w-4" />
                Copy key
              </Button>
              <Button onClick={() => resetState(false)} type="button">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Key name</Label>
              <Input id="api-key-name" name="name" placeholder="Production service" required maxLength={64} minLength={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="api-key-rpm">Per-minute limit</Label>
                <Input id="api-key-rpm" name="requestsPerMinuteLimit" placeholder="Optional override" type="number" min={1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-concurrency">Concurrent requests</Label>
                <Input id="api-key-concurrency" name="concurrentRequestsLimit" placeholder="Optional override" type="number" min={1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-daily">Daily request limit</Label>
                <Input id="api-key-daily" name="dailyRequestLimit" placeholder="Optional override" type="number" min={1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-expiry">Expires at</Label>
                <Input id="api-key-expiry" name="expiresAt" type="datetime-local" />
              </div>
            </div>
            <div className="rounded-3xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Keys are hashed at rest and can carry per-key rate, concurrency, and expiry controls.
              </div>
            </div>
            {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}
            <DialogFooter>
              <Button disabled={isPending} type="submit">
                {isPending ? "Creating..." : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
