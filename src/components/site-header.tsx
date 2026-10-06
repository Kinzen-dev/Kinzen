import Link from "next/link";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath } from "@/lib/site-url";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitch } from "./language-switch";
import { CommandPalette } from "./palette/command-palette";
import { paletteData } from "./palette/palette-data";
import { RevealLayer } from "./motion/reveal-layer";
import { MobileNav } from "./mobile-nav";
import { AnchorFocus } from "./anchor-focus";
import { PlainCopy } from "./plain-copy";
import { plain } from "@/lib/thai";

export function navItems(locale: Locale, dict: Dictionary) {
  const home = localePath(locale, "/");
  const anchor = (id: string) => `${home === "/" ? "" : home}/#${id}`;
  return [
    { href: anchor("work"), label: dict.nav.work },
    { href: anchor("experience"), label: dict.nav.experience },
    { href: anchor("practice"), label: dict.nav.practice },
    { href: anchor("about"), label: dict.nav.about },
    { href: anchor("contact"), label: dict.nav.contact },
    { href: localePath(locale, "/cv"), label: dict.nav.cv },
  ];
}

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const items = navItems(locale, dict);

  return (
    <header
      data-site-header
      className="sticky top-0 z-40 border-b border-rule bg-ground/85 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-ground"
    >
      <div className="shell flex h-[var(--header-h)] items-center gap-6">
        <Link
          href={localePath(locale, "/")}
          className="mr-auto flex items-baseline gap-2 font-semibold tracking-[-0.02em]"
          aria-label={plain(dict.a11y.home)}
        >
          <span data-masthead-mark className="text-[1.0625rem]">
            KINZEN
          </span>
          <span data-masthead-name className="hidden text-sm font-normal text-ink-3 sm:inline">
            Kittipong Khonthong
          </span>
        </Link>

        <nav aria-label={plain(dict.a11y.mainNav)} className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ink-2 transition-colors duration-200 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitch locale={locale} labels={dict.language} label={dict.a11y.languageSwitch} />
          <ThemeToggle
            labels={{ toggle: dict.a11y.themeToggle, light: dict.a11y.themeLight, dark: dict.a11y.themeDark }}
          />
          <CommandPalette data={paletteData(locale, dict)} />
          {/* Site-wide entrance motion; renders nothing. Lives here so every page gets it. */}
          <RevealLayer />
          <AnchorFocus />
          <PlainCopy />
          <MobileNav
            items={items}
            labels={{ open: dict.a11y.openMenu, close: dict.a11y.close, nav: dict.a11y.mainNav }}
          />
        </div>
      </div>
    </header>
  );
}
