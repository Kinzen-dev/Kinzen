import { getProject, projects, t } from "@/content";
import { locales, type Locale } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { projectCard } from "@/components/og/og";
import { getPlateSpec } from "@/components/plates/data";
import { localePath } from "@/lib/site-url";
import { isLive, yearLabel } from "@/components/work/rows";

export const dynamic = "force-static";
export const dynamicParams = false;

/** Route handlers do not inherit the [lang] layout's params: list both segments. */
export function generateStaticParams() {
  return locales.flatMap((lang) => projects.map((p) => ({ lang, slug: p.slug })));
}

/** Share card per public project and locale: /work/<slug>/og.png and /th/work/<slug>/og.png. */
export async function GET(_request: Request, { params }: RouteContext<"/[lang]/work/[slug]/og.png">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const project = getProject(slug);
  if (!project) return new Response("Not found", { status: 404 });
  const dict = getDictionary(locale);
  return projectCard({
    locale,
    name: project.name,
    tagline: t(project.tagline, locale),
    path: localePath(locale, `/work/${project.slug}`),
    status: dict.status[project.status],
    live: isLive(project.status),
    period: yearLabel(project, dict),
    drawing: getPlateSpec(project.id)?.drawing,
  });
}
