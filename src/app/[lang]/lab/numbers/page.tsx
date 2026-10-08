import type { Metadata } from "next";
import type { Locale } from "@/content/schema";
import { links, profile, t } from "@/content";
import { localePath } from "@/lib/site-url";
import { LabViewer } from "@/lab/lab-viewer";

export const metadata: Metadata = {
  title: "Lab: numbers demos",
  robots: { index: false, follow: false },
};

/** Preview-only lab (branch wow/lab, never merged to main): rough numbers demos for King to compare. */
export default async function LabNumbersPage({ params }: PageProps<"/[lang]/lab/numbers">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const banner = {
    name: t(profile.displayName, locale),
    role: t(profile.role, locale),
    heroLine: t(profile.heroLine, locale),
    email: links.find((l) => l.kind === "email")?.href ?? "",
    linkedin: links.find((l) => l.kind === "linkedin")?.href ?? "",
    cvHref: localePath(locale, "/cv"),
  };
  return <LabViewer kind="numbers" locale={locale} banner={banner} />;
}
