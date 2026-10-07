import type { Metadata } from "next";
import type { Locale } from "@/content/schema";
import { LabViewer } from "@/lab/lab-viewer";

export const metadata: Metadata = {
  title: "Lab: hero demos",
  robots: { index: false, follow: false },
};

/** Preview-only lab (branch wow/lab, never merged to main): rough hero demos for King to compare. */
export default async function LabHeroPage({ params }: PageProps<"/[lang]/lab/hero">) {
  const { lang } = await params;
  return <LabViewer kind="hero" locale={lang as Locale} />;
}
