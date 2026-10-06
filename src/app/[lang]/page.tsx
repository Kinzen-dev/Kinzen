import type { Locale } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { Hero } from "@/components/sections/hero";
import { Work } from "@/components/sections/work";
import { Experience } from "@/components/sections/experience";
import { Practice } from "@/components/sections/practice";
import { Skills } from "@/components/sections/skills";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";
import { Doodle } from "@/components/doodles/doodle";
import { AgentDemo } from "@/components/agent-demo/agent-demo";

const practiceIcons = {
  "ai-teams": <Doodle name="robot-team" className="h-full" />,
  "ai-evidence": <Doodle name="checklist-merge" className="h-full" />,
  "ai-guards": <Doodle name="shield-braces" className="h-full" />,
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

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <Work locale={locale} dict={dict} />
      <Experience locale={locale} dict={dict} />
      <Practice locale={locale} dict={dict} icons={practiceIcons} demo={<AgentDemo copy={dict.demo} />} />
      <Skills locale={locale} dict={dict} />
      <About locale={locale} dict={dict} offClockArt={offClockArt} />
      <Contact locale={locale} dict={dict} art={<Doodle name="envelope" className="h-full" />} />
    </>
  );
}
