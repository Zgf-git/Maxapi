"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/config";

const NAV_ITEMS = [
  { href: "/models", label: "Models" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" }
];

const LANG_OPTIONS: Array<{ locale: Locale; label: string }> = [
  { locale: "en", label: "EN" },
  { locale: "zh", label: "中文" }
];

export function PublicNavbar({ showCommercialNavigation = true }: { showCommercialNavigation?: boolean }) {
  const { data: session } = useSession();
  const { locale, setLocale } = useI18n();
  const navItems = showCommercialNavigation ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "/pricing");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-[#08111fcc]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-3 text-lg font-semibold text-white" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(91,231,196,0.2)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <span className="tracking-[0.18em] text-sm uppercase text-slate-100">MaxAPI</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/6 hover:text-white"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center rounded-full border border-white/10 bg-white/6 p-0.5 sm:flex" data-no-translate>
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.locale}
                aria-pressed={locale === opt.locale}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  locale === opt.locale
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setLocale(opt.locale)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {session?.user ? (
            <Link
              className="rounded-full border border-cyan-300/20 bg-cyan-300/12 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/18"
              href="/dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                className="hidden text-sm font-medium text-slate-300 transition hover:text-white sm:block"
                href="/sign-in"
              >
                Sign in
              </Link>
              <Link
                className="rounded-full bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-92"
                href="/sign-in"
              >
                Launch Console
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
