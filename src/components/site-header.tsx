import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath } from "@/lib/site-url";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitch } from "./language-switch";
import { CommandPalette } from "./palette/command-palette";
import { paletteData } from "./palette/palette-data";
import { RevealLayer } from "./motion/reveal-layer";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";
import { HomeLink } from "./home-link";
import { AnchorFocus } from "./anchor-focus";
import { PlainCopy } from "./plain-copy";
import { NavTone } from "./nav-tone";
import { plain } from "@/lib/thai";
import "./site-header.css";

export function navItems(locale: Locale, dict: Dictionary) {
  const home = localePath(locale, "/");
  // "/#work" and "/th#work": no trailing slash on /th, which would 308 and reload the page.
  const anchor = (id: string) => (home === "/" ? `/#${id}` : `${home}#${id}`);
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
    <header data-site-header data-scene="auto" className="site-header">
      <div className="shell flex justify-center">
        {/* Glass pill (v3): floats over every scene, morphs when the brand slides in. */}
        <div className="nav-pill">
          <div className="nav-brand">
            {/* The grid item is this padding-free wrapper, so a closed slot is truly 0px wide. */}
            <div>
              <HomeLink
                href={localePath(locale, "/")}
                className="nav-brand-link font-semibold tracking-[-0.02em]"
                label={plain(dict.a11y.home)}
              >
                <span data-masthead-mark className="text-[1.0625rem]">
                  KINZEN
                </span>
              </HomeLink>
            </div>
          </div>

          <nav aria-label={plain(dict.a11y.mainNav)} className="hidden lg:block">
            <ul className="flex items-center">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} className="nav-link">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <span aria-hidden="true" className="nav-sep hidden lg:block" />

          <div className="flex items-center gap-1">
            <LanguageSwitch locale={locale} labels={dict.language} label={dict.a11y.languageSwitch} />
            <ThemeToggle
              labels={{ toggle: dict.a11y.themeToggle, light: dict.a11y.themeLight, dark: dict.a11y.themeDark }}
            />
            <CommandPalette data={paletteData(locale, dict)} />
            {/* Site-wide entrance motion; renders nothing. Lives here so every page gets it. */}
            <RevealLayer />
            <AnchorFocus />
            <PlainCopy />
            <NavTone />
            <MobileNav
              items={items}
              labels={{ open: dict.a11y.openMenu, close: dict.a11y.close, nav: dict.a11y.mainNav }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
