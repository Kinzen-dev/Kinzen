import type { Metadata } from "next";
import type { Locale } from "@/content/schema";
import { LabViewer } from "@/lab/lab-viewer";

export const metadata: Metadata = {
  title: "Lab: play demos",
  robots: { index: false, follow: false },
};

/** Preview-only lab (branch wow/lab, never merged to main): rough play demos for King to compare. */
export default async function LabPlayPage({ params }: PageProps<"/[lang]/lab/play">) {
  const { lang } = await params;
  return <LabViewer kind="play" locale={lang as Locale} />;
}
