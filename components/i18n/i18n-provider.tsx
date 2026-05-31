"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { LOCALE_COOKIE_NAME, type Locale, normalizeLocale } from "@/lib/i18n/config";
import { zhTranslations } from "@/lib/i18n/translations";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const HYDRATION_SAFE_TRANSLATION_DELAY_MS = 80;

const textOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Record<string, string>>();
const translatedAttributes = ["aria-label", "placeholder", "title"] as const;
const ignoredTags = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT"]);

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function translateValue(value: string, locale: Locale) {
  if (locale === "en") {
    return value;
  }

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const normalized = normalizeText(value);
  const translated = zhTranslations[normalized];

  if (translated) {
    return `${leading}${translated}${trailing}`;
  }

  // Fallback: case-insensitive match for common label/text variations
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, val] of Object.entries(zhTranslations)) {
    if (key.toLowerCase() === lowerNormalized) {
      return `${leading}${val}${trailing}`;
    }
  }

  return value;
}

function shouldSkip(node: Node) {
  const parent = node.parentElement;

  if (!parent) {
    return true;
  }

  if (parent.closest("[data-no-translate]")) {
    return true;
  }

  return Boolean(parent.closest([...ignoredTags].map((tag) => tag.toLowerCase()).join(",")));
}

function translateTextNode(node: Text, locale: Locale) {
  if (shouldSkip(node)) {
    return;
  }

  const current = node.nodeValue ?? "";
  const previousOriginal = textOriginals.get(node);

  // Switching back to English: restore original if we have it
  if (locale === "en") {
    if (previousOriginal && current !== previousOriginal) {
      node.nodeValue = previousOriginal;
    }
    return;
  }

  const previousTranslated = previousOriginal ? translateValue(previousOriginal, locale) : null;
  const original = previousOriginal && (current === previousTranslated || current === previousOriginal) ? previousOriginal : current;

  textOriginals.set(node, original);
  const translated = translateValue(original, locale);

  if (node.nodeValue !== translated) {
    node.nodeValue = translated;
  }
}

function translateElementAttributes(element: Element, locale: Locale) {
  if (element.closest("[data-no-translate]")) {
    return;
  }

  const originals = attributeOriginals.get(element) ?? {};

  for (const attribute of translatedAttributes) {
    const current = element.getAttribute(attribute);

    if (!current) {
      continue;
    }

    const previousOriginal = originals[attribute];

    // Switching back to English: restore original if we have it
    if (locale === "en") {
      if (previousOriginal && current !== previousOriginal) {
        element.setAttribute(attribute, previousOriginal);
      }
      continue;
    }

    const previousTranslated = previousOriginal ? translateValue(previousOriginal, locale) : null;
    originals[attribute] = previousOriginal && (current === previousTranslated || current === previousOriginal) ? previousOriginal : current;
    const translated = translateValue(originals[attribute], locale);

    if (current !== translated) {
      element.setAttribute(attribute, translated);
    }
  }

  attributeOriginals.set(element, originals);
}

function translateTree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    translateTextNode(node as Text, locale);
    node = walker.nextNode();
  }

  if (root instanceof Element) {
    translateElementAttributes(root, locale);
  }

  root.querySelectorAll?.("*").forEach((element) => translateElementAttributes(element, locale));
}

function persistLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(LOCALE_COOKIE_NAME, locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.locale = locale;
}

export function I18nProvider({
  children,
  initialLocale
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const pathname = usePathname();

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(normalizeLocale(nextLocale));
      }
    }),
    [locale]
  );

  useEffect(() => {
    persistLocale(locale);

    // Use double requestAnimationFrame to ensure translation happens after
    // React hydration but before the browser paints, minimizing English flash.
    // Falls back to a short timeout for safety.
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        translateTree(document.body, locale);
      });
    });

    // Safety fallback: if rAF doesn't fire promptly, force translation.
    const timeout = window.setTimeout(() => {
      cancelAnimationFrame(raf2);
      translateTree(document.body, locale);
    }, HYDRATION_SAFE_TRANSLATION_DELAY_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timeout);
    };
  }, [locale, pathname]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}
