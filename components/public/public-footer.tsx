import Link from "next/link";

export function PublicFooter({ showCommercialNavigation = true }: { showCommercialNavigation?: boolean }) {
  return (
    <footer className="border-t border-white/8 bg-[#07111f]/90">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[0.9fr_1fr_1fr_1fr] lg:items-center">
          <div className="flex items-center justify-start sm:col-span-2 lg:col-span-1 lg:justify-center">
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              MaxAPI
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-100">Product</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link className="hover:text-white" href="/models">Models</Link></li>
              {showCommercialNavigation ? <li><Link className="hover:text-white" href="/pricing">Pricing</Link></li> : null}
              <li><Link className="hover:text-white" href="/docs">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-100">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link className="hover:text-white" href="/docs/quickstart">Quickstart</Link></li>
              <li><Link className="hover:text-white" href="/docs">API Reference</Link></li>
              <li><Link className="hover:text-white" href="/status">Status</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-100">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/8 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} MaxAPI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
