import type { Metadata } from "next";

import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { canShowCommercialNavigation } from "@/lib/run-mode";

export const metadata: Metadata = {
  title: "MaxAPI — Unified AI Gateway",
  description:
    "OpenAI-compatible AI gateway with routing, billing, request tracing, and resilient upstream failover."
};

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const showCommercialNavigation = canShowCommercialNavigation();

  return (
    <div className="app-shell-grid flex min-h-screen flex-col">
      <PublicNavbar showCommercialNavigation={showCommercialNavigation} />
      <main className="flex-1">{children}</main>
      <PublicFooter showCommercialNavigation={showCommercialNavigation} />
    </div>
  );
}
