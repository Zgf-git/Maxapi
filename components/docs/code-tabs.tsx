"use client";

import { useState } from "react";

export type CodeExample = {
  label: string;
  language: string;
  code: string;
};

export function CodeTabs({ examples }: { examples: CodeExample[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <div className="flex border-b border-slate-800">
        {examples.map((ex, i) => (
          <button
            key={ex.label}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              i === active
                ? "border-b-2 border-emerald-500 text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setActive(i)}
            type="button"
          >
            {ex.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="text-sm leading-relaxed">
          <code className="font-mono text-slate-200">{examples[active].code}</code>
        </pre>
      </div>
    </div>
  );
}
