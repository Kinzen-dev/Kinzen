import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { locales, type Locale } from "@/content/schema";
import { getDictionary, getPlainDictionary } from "@/i18n/dictionaries";
import { SITE_URL, alternates, localePath } from "@/lib/site-url";
import { pageOpenGraph } from "@/lib/open-graph";
import { ThemeScript } from "@/components/theme-script";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionGovernor } from "@/motion/motion-governor";
import { fontVariables } from "../fonts";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getPlainDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: "%s | Kinzen" },
    description: dict.meta.description,
    alternates: alternates("/", lang),
    applicationName: "Kinzen",
    authors: [{ name: "Kittipong Khonthong", url: SITE_URL }],
    creator: "Kittipong Khonthong",
    openGraph: pageOpenGraph(lang, null, "profile"),
    twitter: { card: "summary_large_image", images: [localePath(lang, "/og.png")] },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    // Keep in sync with THEME_COLOR (theme-toggle.tsx), which repaints these for a chosen theme.
    { media: "(prefers-color-scheme: dark)", color: "#14120f" },
    { media: "(prefers-color-scheme: light)", color: "#f5f1ea" },
  ],
  colorScheme: "light dark",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html lang={lang} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <a href="#main" className="sr-only-focusable fixed top-3 left-3 z-50 bg-ink px-3 py-2 text-ground">
          {dict.a11y.skipToContent}
        </a>
        <SiteHeader locale={lang} dict={dict} />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter locale={lang} dict={dict} />
        <MotionGovernor />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
