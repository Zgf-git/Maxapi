export const LOCALE_COOKIE_NAME = "maxapi_locale";

export const SUPPORTED_LOCALES = ["en", "zh"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "zh" ? "zh" : "en";
}
