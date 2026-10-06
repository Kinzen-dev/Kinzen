import { experience, profile, t } from "@/content";
import { locales, type Locale } from "@/content/schema";
import { homeCard } from "@/components/og/og";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/** Share card for the home page, one per locale: /og.png and /th/og.png. */
export async function GET(_request: Request, { params }: RouteContext<"/[lang]/og.png">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const studio = experience.find((e) => e.type === "founder" && e.end === "present")?.org.name ?? profile.handle;
  return homeCard({
    name: t(profile.displayName, locale),
    city: t(profile.location.city, locale),
    role: t(profile.role, locale),
    studio: studio.replace(/ Co\., Ltd\.$/, ""),
  });
}
