import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FAQS } from "@/lib/content/faq";

export const metadata: Metadata = {
  title: "常见问题 - MaxAPI",
  description:
    "MaxAPI 常见问题解答。了解 API 中转工作原理、定价方式、OpenAI SDK 兼容性、充值方法、故障转移机制等。"
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-10">
        <Link
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          href="/"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Back to home
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Everything you need to know about MaxAPI.
        </p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h2 className="font-medium text-slate-900">{faq.question}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
