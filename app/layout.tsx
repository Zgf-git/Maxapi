import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

import { I18nProvider } from "@/components/i18n/i18n-provider";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { env } from "@/lib/env";
import { LOCALE_COOKIE_NAME, normalizeLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "MaxAPI",
  description: "AI API routing platform",
  metadataBase: new URL(env.APP_BASE_URL)
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"} data-locale={locale} suppressHydrationWarning>
      <body>
        <AuthSessionProvider>
          <I18nProvider initialLocale={locale}>
            {children}
          </I18nProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
