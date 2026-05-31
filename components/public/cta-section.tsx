import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="cta-grid-panel overflow-hidden px-8 py-14 text-center sm:px-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,231,196,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(112,164,255,0.18),transparent_36%)]" />
        <div className="cta-grid-dots absolute inset-0 opacity-80" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Ready to get started with MaxAPI?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Developer trusted · aggregate leading AI providers globally
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#5be7c4,#70a4ff)] px-8 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-95"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Read docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
