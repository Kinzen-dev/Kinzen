import type { Locale } from "@/content/schema";
import { getDictionary } from "@/i18n/dictionaries";
import { Hero } from "@/components/sections/hero";
import { Work } from "@/components/sections/work";
import { Experience } from "@/components/sections/experience";
import { Practice } from "@/components/sections/practice";
import { Skills } from "@/components/sections/skills";
import { About } from "@/components/sections/about";
import { Contact } from "@/components/sections/contact";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = getDictionary(locale);

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <Work locale={locale} dict={dict} />
      <Experience locale={locale} dict={dict} />
      <Practice locale={locale} dict={dict} />
      <Skills locale={locale} dict={dict} />
      <About locale={locale} dict={dict} />
      <Contact locale={locale} dict={dict} />
    </>
  );
}
