"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  language,
  title
}: {
  code: string;
  language: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border bg-stone-950 text-stone-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-400">{language}</p>
        </div>
        <button
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:bg-white/10"
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
}
