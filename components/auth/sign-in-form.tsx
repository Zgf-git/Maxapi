"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { registerUser, type RegisterState } from "@/lib/auth/register";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RegisterState = {};

export function SignInForm({ allowSelfSignup, allowReferral }: { allowSelfSignup: boolean; allowReferral: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? "";
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [registerState, registerAction, isRegisterPending] = useActionState(registerUser, initialState);

  useEffect(() => {
    if (registerState.success) {
      setError(null);
    }
  }, [registerState.success]);

  async function onSignInSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
        callbackUrl: "/dashboard"
      });

      if (result?.error) {
        setError("Invalid credentials, or your email has not been verified yet.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-md border-white/10 bg-[#091423]/88 shadow-[0_24px_70px_rgba(2,6,23,0.38)] backdrop-blur-2xl">
      <CardHeader className="space-y-4">
        <div className="inline-flex rounded-full border border-white/10 bg-white/6 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === "sign-in" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
            onClick={() => setMode("sign-in")}
            type="button"
          >
            Sign in
          </button>
          {allowSelfSignup ? (
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${mode === "sign-up" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400"}`}
              onClick={() => setMode("sign-up")}
              type="button"
            >
              Create account
            </button>
          ) : null}
        </div>
        <div>
          <CardTitle>{mode === "sign-in" || !allowSelfSignup ? "Access your dashboard" : "Create your MaxAPI account"}</CardTitle>
          <CardDescription>
            {mode === "sign-in" || !allowSelfSignup
              ? "Sign in to manage API keys for your routing platform."
              : "Create the first account for this MVP with email and password."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "sign-in" || !allowSelfSignup ? (
          <form action={onSignInSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" name="email" placeholder="user@example.com" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input id="signin-password" name="password" type="password" required minLength={8} />
            </div>
            {error ? <p className="text-sm text-[var(--color-destructive)]">{error}</p> : null}
            <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
              <a className="transition hover:text-white" href="/forgot-password">Forgot password?</a>
              <a className="transition hover:text-white" href="/verify-email/request">Resend verification</a>
            </div>
            {!allowSelfSignup ? <p className="text-sm text-slate-500">Account creation is disabled in this environment.</p> : null}
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <form action={registerAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <Input id="signup-name" name="name" placeholder="Max API Admin" required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" placeholder="user@example.com" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" name="password" type="password" required minLength={8} />
            </div>
            {allowReferral ? (
              <div className="space-y-2">
                <Label htmlFor="signup-referral">Referral code (optional)</Label>
                <Input id="signup-referral" name="referralCode" placeholder="ABCDEF12" defaultValue={referralCode} />
              </div>
            ) : null}
            {registerState.error ? <p className="text-sm text-[var(--color-destructive)]">{registerState.error}</p> : null}
            {registerState.success ? (
              <div className="space-y-2 text-sm text-emerald-300">
                <p>Account created. Check your email, then sign in.</p>
                {registerState.previewUrl ? (
                  <a className="text-cyan-300 underline underline-offset-4" href={registerState.previewUrl}>
                    Open verification link
                  </a>
                ) : null}
                <button
                  className="block text-left text-cyan-300 underline underline-offset-4"
                  onClick={() => setMode("sign-in")}
                  type="button"
                >
                  Return to sign in
                </button>
              </div>
            ) : null}
            <Button className="w-full" disabled={isRegisterPending} type="submit" variant="secondary">
              {isRegisterPending ? "Creating..." : "Create account"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
