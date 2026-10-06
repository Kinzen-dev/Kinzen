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
import { AgentDemo } from "@/components/agent-demo/agent-demo";
import { getV3 } from "@/i18n/v3";
import { SectionHeader } from "@/components/sections/section-header";
import { NumbersStrip } from "@/components/v3/numbers/numbers-strip";
import { YimwhanScene } from "@/components/v3/yimwhan/yimwhan-scene";
import { HelmScene } from "@/components/v3/helm/helm-scene";
import { MoreWork } from "@/components/v3/more-work/more-work";

const practiceIcons = {
  "ai-teams": <Doodle name="robot-team" className="size-full" />,
  "ai-evidence": <Doodle name="checklist-merge" className="size-full" />,
  "ai-guards": <Doodle name="shield-braces" className="size-full" />,
};

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
      <Hero locale={locale} dict={dict} fx={<HeroFx />} />
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
      <Practice locale={locale} dict={dict} icons={practiceIcons} demo={<AgentDemo copy={dict.demo} />} />
      <Skills locale={locale} dict={dict} />
      <About locale={locale} dict={dict} offClockArt={offClockArt} />
      <Contact locale={locale} dict={dict} art={<Doodle name="envelope" className="size-full" />} />
      <JsonLd data={profilePageJsonLd(locale, dict.meta.title)} />
    </>
  );
}
