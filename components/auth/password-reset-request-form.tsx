"use client";

import { useActionState } from "react";

import { requestPasswordReset, type PasswordResetState } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PasswordResetState = {};

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We will send a password reset link to your account email.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" name="email" type="email" required />
          </div>
          {state.error ? <p className="text-sm text-[var(--color-destructive)]">{state.error}</p> : null}
          {state.success ? (
            <div className="space-y-2 text-sm text-emerald-300">
              <p>If the account exists, a reset link has been issued.</p>
              {state.previewUrl ? (
                <a className="text-cyan-300 underline underline-offset-4" href={state.previewUrl}>
                  Open password reset link
                </a>
              ) : null}
            </div>
          ) : null}
          <Button disabled={pending} type="submit">
            {pending ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
