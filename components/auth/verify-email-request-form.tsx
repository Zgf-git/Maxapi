"use client";

import { useActionState } from "react";

import { requestEmailVerification, type AuthEmailState } from "@/lib/auth/verification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthEmailState = {};

export function VerifyEmailRequestForm() {
  const [state, action, pending] = useActionState(requestEmailVerification, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Resend verification email</CardTitle>
        <CardDescription>Request a new email verification link for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email</Label>
            <Input id="verify-email" name="email" type="email" required />
          </div>
          {state.error ? <p className="text-sm text-[var(--color-destructive)]">{state.error}</p> : null}
          {state.success ? (
            <div className="space-y-2 text-sm text-emerald-300">
              <p>If the account needs verification, a new link has been issued.</p>
              {state.previewUrl ? (
                <a className="text-cyan-300 underline underline-offset-4" href={state.previewUrl}>
                  Open verification link
                </a>
              ) : null}
            </div>
          ) : null}
          <Button disabled={pending} type="submit">
            {pending ? "Sending..." : "Send verification link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
