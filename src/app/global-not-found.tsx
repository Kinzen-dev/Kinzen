import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { getDictionary } from "@/i18n/dictionaries";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const notoThai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "404 | Kinzen",
  description: "This page does not exist.",
  robots: { index: false },
};

/**
 * Unmatched URLs skip the locale layout entirely, so this page carries its own
 * html/body, theme and fonts, and speaks both languages instead of guessing one.
 */
export default function GlobalNotFound() {
  const en = getDictionary("en").notFound;
  const th = getDictionary("th").notFound;

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${notoThai.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <main className="shell grid min-h-dvh content-center gap-10 py-24">
          <p className="readout">404</p>
          <div className="grid gap-4">
            <h1 className="max-w-[16ch] text-2xl tracking-[-0.035em]">{en.title}</h1>
            <p className="max-w-[46ch] text-ink-2">{en.body}</p>
            <p>
              <Link href="/" className="link text-lg">
                {en.home}
              </Link>
            </p>
          </div>
          <div lang="th" className="grid gap-3 border-t border-rule pt-8">
            <p className="text-xl font-semibold">{th.title}</p>
            <p className="max-w-[46ch] text-ink-2">{th.body}</p>
            <p>
              <Link href="/th" className="link">
                {th.home}
              </Link>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
