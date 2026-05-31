"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Network, ShieldCheck, Sparkles, Wallet } from "lucide-react";

const HERO_CARDS = [
  {
    title: "Unified access",
    description: "Use one API key and one endpoint to call different language models without splitting traffic across vendors.",
    cta: "View models",
    icon: Sparkles
  },
  {
    title: "Stable routing",
    description: "Switch upstream providers, set route policies, and keep fallback logic on the server instead of in the client.",
    cta: "Learn routing",
    icon: Network
  },
  {
    title: "Transparent billing",
    description: "See usage, balances, pending charges, and adjustments in one place so cost stays explainable.",
    cta: "See pricing",
    icon: Wallet
  },
  {
    title: "Controlled access",
    description: "Manage keys, limits, logs, and model permissions from a single control layer for your team or users.",
    cta: "Open docs",
    icon: ShieldCheck
  }
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(89,173,255,0.13),transparent_28%),radial-gradient(circle_at_center,rgba(91,231,196,0.08),transparent_34%)]" />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 lg:px-6 lg:pb-12 lg:pt-18">
        <div className="relative text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-300/8 px-4 py-1.5 text-sm font-medium text-cyan-100 glass-panel">
            <Sparkles className="h-4 w-4" />
            One endpoint · multiple model providers
          </div>

          <h1 className="mx-auto mt-10 max-w-5xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
            A unified API
            <br />
            for language models
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Access OpenAI, Claude, Gemini, DeepSeek, and more through one OpenAI-compatible interface.
            Keep integration simple while routing, billing, fallback, and permissions stay on the server.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#28b5ff,#5be7c4)] px-7 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95"
              href="/sign-in"
            >
              Get API key
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              href="/docs"
            >
              Read documentation
            </Link>
          </div>
        </div>

        <div className="relative mt-14">
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl font-semibold tracking-tight text-white">249.4B</p>
              <p className="mt-2 text-sm text-slate-500">Daily token volume</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-semibold tracking-tight text-white">3103.9B</p>
              <p className="mt-2 text-sm text-slate-500">Lifetime token volume</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-semibold tracking-tight text-white">4076</p>
              <p className="mt-2 text-sm text-slate-500">Registered developers</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-semibold tracking-tight text-white">19</p>
              <p className="mt-2 text-sm text-slate-500">Connected models</p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-4">
          {HERO_CARDS.map((card, index) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className="glass-panel overflow-hidden">
                <div className="flex min-h-[170px] items-start justify-between bg-[linear-gradient(180deg,rgba(34,49,89,0.36),rgba(10,18,34,0.05))] p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/16 bg-cyan-300/10 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="rounded-full border border-white/8 bg-[#08111f] px-2.5 py-1 text-xs text-slate-400">
                    0{index + 1}
                  </div>
                </div>
                <div className="border-t border-white/6 bg-[#0a1322]/92 p-6">
                  <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-400">{card.description}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-200">
                    {card.cta}
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
