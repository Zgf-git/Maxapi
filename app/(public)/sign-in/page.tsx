import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { canSelfSignup, canUseReferral } from "@/lib/run-mode";

export const metadata: Metadata = {
  title: "登录 - MaxAPI",
  description: "登录 MaxAPI 管理 API 密钥、监控请求并控制账户余额。"
};

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-12 lg:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="glass-panel overflow-hidden p-8 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,231,196,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(112,164,255,0.18),transparent_42%)]" />
          <div className="relative space-y-6">
            <div className="inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
            AI API Routing Platform
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Access your routing dashboard
            </h1>
            <p className="max-w-xl text-lg leading-7 text-slate-300">
              Sign in to manage keys, requests, provider health, and billing states inside one operator-facing workspace.
            </p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 text-xs font-bold">1</span>
              Create and manage API keys
            </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 text-xs font-bold">2</span>
                Monitor request logs, routing, and fallback outcomes
            </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 text-xs font-bold">3</span>
                Track balance, usage, refunds, and provider operations
            </li>
            </ul>
          </div>
        </section>
        <SignInForm allowSelfSignup={canSelfSignup()} allowReferral={canUseReferral()} />
      </div>
    </main>
  );
}
