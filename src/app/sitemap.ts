import type { MetadataRoute } from "next";
import { lastUpdated, projects } from "@/content";
import { locales } from "@/content/schema";
import { SITE_URL, localePath } from "@/lib/site-url";

export const dynamic = "force-static";

const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/** Every public page in both languages, each entry listing its alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${lastUpdated}-01T00:00:00Z`);
  const paths = ["/", "/work", "/cv", ...projects.map((p) => `/work/${p.slug}`)];

  return paths.flatMap((path) =>
    locales.map((locale) => ({
      url: abs(localePath(locale, path)),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages: {
          en: abs(localePath("en", path)),
          th: abs(localePath("th", path)),
          "x-default": abs(localePath("en", path)),
        },
      },
    })),
  );
}
