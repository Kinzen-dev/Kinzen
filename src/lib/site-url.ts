import type { Locale } from "@/content/schema";

export const SITE_URL = "https://www.kinzen.dev";

/** Public path for a locale: English is unprefixed, Thai lives under /th. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return clean;
  return clean === "/" ? "/th" : `/th${clean}`;
}

/** Strip the locale prefix from a pathname, returning the locale-neutral path. */
export function neutralPath(pathname: string): string {
  const stripped = pathname.replace(/^\/(th|en)(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

/** Canonical + hreflang for a locale-neutral path (e.g. "/", "/cv", "/work/helm"). */
export function alternates(path: string, locale: Locale = "en") {
  const neutral = neutralPath(path);
  return {
    canonical: localePath(locale, neutral),
    languages: {
      en: localePath("en", neutral),
      th: localePath("th", neutral),
      "x-default": localePath("en", neutral),
    },
  };
}

/**
 * Link prefetch for a site path. Unprefixed single-segment English routes (/cv, /work) are
 * served through a rewrite to /en/..., but Next's client predicts their route from the patterns
 * it has seen and asks for the [lang] home segment with lang="cv" (a 404 in the console). For
 * those, skip the prefetch; the click still navigates client-side with a full request.
 */
export function prefetchFor(href: string): false | undefined {
  return /^\/(?!th(?:[/?#]|$))[^/?#]+$/.test(href) ? false : undefined;
}
