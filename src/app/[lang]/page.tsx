import type { Metadata } from "next";
import type { Locale } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { Hero } from "@/components/sections/hero";
import { Experience } from "@/components/sections/experience";
import { Practice } from "@/components/sections/practice";
import { Skills } from "@/components/sections/skills";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { JsonLd, profilePageJsonLd } from "@/lib/json-ld";
import { HeroFx } from "@/fx/react/hero-fx";
import { Doodle } from "@/components/doodles/doodle";
import { getV3 } from "@/i18n/v3";
import { SectionHeader } from "@/components/sections/section-header";
import { NumbersStrip } from "@/components/v3/numbers/numbers-strip";
import { YimwhanScene } from "@/components/v3/yimwhan/yimwhan-scene";
import { HelmScene } from "@/components/v3/helm/helm-scene";
import { MoreWork } from "@/components/v3/more-work/more-work";
import { pageOpenGraph } from "@/lib/open-graph";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return { openGraph: pageOpenGraph(lang as Locale, "/", "profile") };
}

const offClockArt = (
  <>
    <Doodle name="football" className="h-14" />
    <Doodle name="car" className="h-14" />
    <Doodle name="gamepad" className="h-14" />
  </>
);

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);
  const v3 = getV3(locale);

  return (
    <>
      <Hero locale={locale} dict={dict} fx={<HeroFx />} v3={v3} />
      <NumbersStrip locale={locale} dict={dict} v3={v3} />
      {/* v3 work showcase (D5): two sticky scenes, then the card collage; the ledger lives on /work. */}
      <section id="work" aria-labelledby="work-title" className="pt-24 md:pt-32">
        <div className="shell">
          <SectionHeader id="work" title={dict.sections.work} intro={v3.moreWork.sectionIntro} />
        </div>
        <YimwhanScene locale={locale} dict={dict} v3={v3} />
        <HelmScene locale={locale} dict={dict} v3={v3} />
        <MoreWork locale={locale} dict={dict} v3={v3} />
      </section>
      <Experience locale={locale} dict={dict} />
      <Practice locale={locale} dict={dict} v3={v3} />
      <Skills locale={locale} dict={dict} v3={v3} />
      <About locale={locale} dict={dict} offClockArt={offClockArt} />
      <Contact locale={locale} dict={dict} v3={v3} />
      <JsonLd data={profilePageJsonLd(locale, dict.meta.title)} />
    </>
  );
}
