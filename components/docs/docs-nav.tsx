"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Code, Home, Layers, MessageSquare, ShieldAlert, Terminal, Waypoints, Zap } from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs", label: "Overview", icon: Home },
      { href: "/docs/quickstart", label: "Quickstart", icon: Zap }
    ]
  },
  {
    title: "API Reference",
    items: [
      { href: "/docs/api/chat-completions", label: "Chat Completions", icon: MessageSquare },
      { href: "/docs/api/embeddings", label: "Embeddings", icon: Waypoints }
    ]
  },
  {
    title: "Integration",
    items: [
      { href: "/docs/sdks", label: "SDKs & Examples", icon: Terminal },
      { href: "/docs/migration", label: "Migrate from OpenAI", icon: Code }
    ]
  },
  {
    title: "Resources",
    items: [
      { href: "/docs/models", label: "Models", icon: Layers },
      { href: "/docs/errors", label: "Error Codes", icon: ShieldAlert },
      { href: "/status", label: "System Status", icon: BookOpen }
    ]
  }
];

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel top-24 shrink-0 overflow-y-auto p-4 lg:sticky lg:h-[calc(100vh-7rem)] lg:w-72">
      <Link className="mb-6 flex items-center gap-3 text-lg font-semibold text-white" href="/">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </span>
        <span className="tracking-[0.16em] text-sm uppercase text-slate-100">MaxAPI Docs</span>
      </Link>

      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-6">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {section.title}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
                        : "border border-transparent text-slate-300 hover:bg-white/6 hover:text-white"
                    }`}
                    href={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
