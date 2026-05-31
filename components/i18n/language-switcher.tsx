"use client";

import { useI18n } from "@/components/i18n/i18n-provider";
import type { Locale } from "@/lib/i18n/config";

const OPTIONS: Array<{ locale: Locale; label: string }> = [
  { locale: "en", label: "EN" },
  { locale: "zh", label: "中文" }
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="fixed right-4 top-4 z-50 flex rounded-full border bg-white/90 p-1 text-xs font-semibold shadow-sm backdrop-blur"
      data-no-translate
    >
      {OPTIONS.map((option) => (
        <button
          aria-pressed={locale === option.locale}
          className={`rounded-full px-3 py-1.5 transition ${
            locale === option.locale
              ? "bg-stone-950 text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
          key={option.locale}
          onClick={() => setLocale(option.locale)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
