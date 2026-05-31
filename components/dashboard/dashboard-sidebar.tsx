"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpenText,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Layers3,
  Play,
  Globe,
  Users,
  type LucideIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/config";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/requests", label: "Requests", icon: Activity },
  { href: "/dashboard/playground", label: "Playground", icon: Play },
  { href: "/dashboard/billing", label: "My Billing", icon: CreditCard },
  { href: "/dashboard/referral", label: "Referral", icon: Users },
  { href: "/dashboard/models", label: "Models", icon: Layers3 },
  { href: "/dashboard/quickstart", label: "Quickstart", icon: BookOpenText }
];

const LANG_OPTIONS: Array<{ locale: Locale; label: string }> = [
  { locale: "en", label: "EN" },
  { locale: "zh", label: "中文" }
];

export function DashboardSidebar({
  showBilling = true,
  showReferral = true
}: {
  showBilling?: boolean;
  showReferral?: boolean;
}) {
  const pathname = usePathname();
  const { locale, setLocale } = useI18n();
  const sidebarItems = SIDEBAR_ITEMS.filter((item) => {
    if (item.href === "/dashboard/billing") {
      return showBilling;
    }

    if (item.href === "/dashboard/referral") {
      return showReferral;
    }

    return true;
  });

  return (
    <aside className="glass-panel sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-64 flex-col rounded-[1.8rem] border border-white/8 bg-[#07101dcc] shadow-[0_24px_70px_rgba(3,8,20,0.48)]">
      <div className="px-4 py-5">
        <Link className="flex items-center gap-3 text-white" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em]">MaxAPI</span>
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Developer console</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition",
                isActive
                  ? "border-cyan-300/30 bg-[linear-gradient(135deg,rgba(91,231,196,0.2),rgba(112,164,255,0.22))] text-white shadow-[0_18px_50px_rgba(5,14,30,0.42),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white",
                item.disabled && "pointer-events-none opacity-50"
              )}
              href={item.href}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/8 px-4 py-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
          <Globe className="h-3.5 w-3.5" />
          <span>Language</span>
        </div>
        <div className="mt-3 flex rounded-full border border-white/8 bg-white/6 p-0.5" data-no-translate>
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.locale}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition ${
                locale === opt.locale
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
              onClick={() => setLocale(opt.locale)}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
