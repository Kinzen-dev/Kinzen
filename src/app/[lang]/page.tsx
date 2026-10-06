import type { Locale } from "@/content/schema";
import { profile, t } from "@/content";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = lang as Locale;
  return (
    <section className="shell py-24">
      <h1 className="text-display font-semibold tracking-[-0.06em]">KINZEN</h1>
      <p className="mt-6 max-w-[40ch] text-xl">{t(profile.heroLine, locale)}</p>
    </section>
  );
}
