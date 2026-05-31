"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  FileQuestion,
  Gauge,
  LineChart,
  Megaphone,
  Route,
  ScrollText,
  ServerCog,
  Settings,
  Shield,
  ShieldUser,
  TicketPercent,
  Timer,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";

import type { InternalCapabilities } from "@/lib/internal/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requires?: keyof InternalCapabilities;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/internal", label: "Home", icon: Gauge }]
  },
  {
    label: "Users",
    items: [{ href: "/internal/users", label: "All users", icon: Users }]
  },
  {
    label: "Finance",
    items: [
      { href: "/internal/finance/revenue", label: "Revenue", icon: LineChart },
      { href: "/internal/finance/top-ups", label: "Top-ups", icon: Wallet },
      { href: "/internal/finance/cases", label: "Cases", icon: FileQuestion },
      { href: "/internal/finance/providers", label: "Payment providers", icon: CreditCard }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/internal/operations", label: "Live", icon: Activity },
      { href: "/internal/operations/pending", label: "Pending usage", icon: Timer },
      { href: "/internal/operations/failures", label: "Failures", icon: AlertTriangle },
      { href: "/internal/operations/abuse", label: "Abuse events", icon: Shield }
    ]
  },
  {
    label: "Routing",
    items: [
      { href: "/internal/routing/providers", label: "Upstreams", icon: ServerCog },
      { href: "/internal/routing/policies", label: "Policies", icon: Route }
    ]
  },
  {
    label: "Growth",
    items: [
      { href: "/internal/growth/codes", label: "Redemption codes", icon: TicketPercent },
      { href: "/internal/growth/announcements", label: "Announcements", icon: Megaphone },
      { href: "/internal/growth/referrals", label: "Referrals", icon: UserPlus }
    ]
  },
  {
    label: "System",
    items: [
      { href: "/internal/audit", label: "Audit log", icon: ScrollText },
      { href: "/internal/settings", label: "Settings", icon: Settings }
    ]
  }
];

export function InternalSidebar({ capabilities }: { capabilities: InternalCapabilities }) {
  const pathname = usePathname();

  function isItemActive(href: string) {
    if (href === "/internal") return pathname === "/internal";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isItemVisible(item: NavItem) {
    if (!item.requires) return true;
    return Boolean(capabilities[item.requires]);
  }

  return (
    <aside className="glass-panel sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-64 flex-col rounded-[1.8rem] border border-white/8 bg-[#07101dcc] shadow-[0_24px_70px_rgba(3,8,20,0.48)]">
      <div className="px-4 py-5">
        <Link className="flex items-center gap-3 text-white" href="/internal">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <ShieldUser className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.18em]">MaxAPI</span>
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">Internal console</p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(isItemVisible);
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                {group.label}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition",
                          active
                            ? "border-cyan-300/30 bg-[linear-gradient(135deg,rgba(91,231,196,0.2),rgba(112,164,255,0.22))] text-white shadow-[0_18px_50px_rgba(5,14,30,0.42),inset_0_1px_0_rgba(255,255,255,0.08)]"
                            : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/8 px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to user dashboard
        </Link>
      </div>
    </aside>
  );
}
