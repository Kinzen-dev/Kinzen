import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import { getDictionary } from "@/i18n/dictionaries";
import { ThemeScript } from "@/components/theme-script";
import { Doodle } from "@/components/doodles/doodle";
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

  // Thai first on /th URLs: decided before paint, so the order never jumps.
  const order = `if(/^\\/th(\\/|$)/.test(location.pathname)){document.documentElement.lang="th";document.documentElement.dataset.nf="th"}`;

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${notoThai.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <script dangerouslySetInnerHTML={{ __html: order }} />
      </head>
      <body>
        <header className="shell flex items-center justify-between pt-6">
          <Link href="/" className="font-semibold tracking-[-0.02em]">
            KINZEN
          </Link>
          <span className="readout">404</span>
        </header>
        <main className="shell grid min-h-[calc(100dvh-5rem)] content-center py-16">
          <div className="nf-card grid items-center gap-10 rounded-card border border-rule bg-surface p-[calc(2*var(--inset-card))] shadow-soft md:grid-cols-12 md:gap-6">
            <div className="grid place-items-center md:col-span-4">
              <div className="grid size-40 place-items-center rounded-full bg-pastel-tools md:size-56">
                <Doodle name="lost-robot" className="h-24 text-pastel-ink md:h-32" />
              </div>
            </div>
            <div className="nf-copy grid gap-8 md:col-span-7 md:col-start-6">
              <div lang="en" className="nf-en grid gap-3">
                <h1 className="max-w-[16ch] text-2xl tracking-[-0.035em]">{en.title}</h1>
                <p className="max-w-[46ch] text-ink-2">{en.body}</p>
                <p>
                  <Link
                    href="/"
                    className="inline-flex h-11 items-center rounded-full bg-gold px-[var(--inset-btn)] text-sm font-semibold text-gold-ink"
                  >
                    {en.home}
                  </Link>
                </p>
              </div>
              <div lang="th" className="nf-th grid gap-3 border-t border-rule pt-8">
                <p className="max-w-[16ch] text-2xl font-semibold tracking-[-0.02em]">{th.title}</p>
                <p className="max-w-[46ch] text-ink-2">{th.body}</p>
                <p>
                  <Link
                    href="/th"
                    className="inline-flex h-11 items-center rounded-full border border-rule-strong px-[var(--inset-btn)] text-sm font-medium"
                  >
                    {th.home}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
