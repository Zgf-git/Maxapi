"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { FAQS } from "@/lib/content/faq";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
      <div className="mb-6 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-500">FAQ</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Common operator questions.</h2>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div key={faq.question} className="glass-panel overflow-hidden">
              <button
                className="flex w-full items-center justify-between px-6 py-5 text-left"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                type="button"
              >
                <span className="font-medium text-white">{faq.question}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen ? (
                <div className="px-6 pb-5 text-sm leading-6 text-slate-400">
                  {faq.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
