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

export function alternates(path: string) {
  return {
    canonical: path,
    languages: {
      en: localePath("en", path),
      th: localePath("th", path),
      "x-default": localePath("en", path),
    },
  };
}
