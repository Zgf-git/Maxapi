"use client";

import { useActionState } from "react";

import { resetPasswordWithToken, type PasswordResetState } from "@/lib/auth/password-reset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: PasswordResetState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordWithToken, initialState);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Set a new password for your MaxAPI account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input name="token" type="hidden" value={token} />
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" name="password" type="password" minLength={8} required />
          </div>
          {state.error ? <p className="text-sm text-[var(--color-destructive)]">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-300">Password updated. Return to sign in.</p> : null}
          <Button disabled={pending || !token} type="submit">
            {pending ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
