import type { Metadata } from "next";
import type { Locale } from "@/content/schema";
import { getPlainDictionary } from "@/i18n/dictionaries";
import { localePath } from "./site-url";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * Open Graph for a non-project page. A page that sets openGraph replaces the layout's whole
 * object (metadata merges shallowly), so every page builds it here: og:url is the page's own
 * canonical, og:type is profile for the person pages (home, CV) and website for the rest.
 * og:title and og:description fall back to the page's title and description. Without a path
 * (the layout's default) there is no og:url, so a page that forgets to set its own never claims
 * another page's URL.
 */
export function pageOpenGraph(locale: Locale, path: string | null, type: "profile" | "website"): OpenGraph {
  const dict = getPlainDictionary(locale);
  const shared = {
    siteName: "Kinzen",
    ...(path === null ? {} : { url: localePath(locale, path) }),
    locale: locale === "th" ? "th_TH" : "en_US",
    alternateLocale: locale === "th" ? "en_US" : "th_TH",
    images: [{ url: localePath(locale, "/og.png"), width: 1200, height: 630, alt: dict.work.ogAltHome }],
  };
  if (type === "website") return { ...shared, type };
  return { ...shared, type, firstName: "Kittipong", lastName: "Khonthong", username: "Kinzen" };
}
