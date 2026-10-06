import Link from "next/link";
import type { Locale } from "@/content/schema";
import type { Dictionary } from "@/i18n/dictionaries";
import { localePath } from "@/lib/site-url";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitch } from "./language-switch";
import { CommandPalette } from "./palette/command-palette";
import { paletteData } from "./palette/palette-data";
import { RevealLayer } from "./motion/reveal-layer";

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
          aria-label="Kinzen, home"
        >
          <span data-masthead-mark className="text-[1.0625rem]">
            KINZEN
          </span>
          <span className="hidden text-sm font-normal text-ink-3 sm:inline">Kittipong Khonthong</span>
        </Link>

        <nav aria-label={dict.a11y.mainNav} className="hidden lg:block">
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
          <button
            type="button"
            popoverTarget="mobile-nav"
            className="grid size-9 place-items-center text-ink-2 hover:text-ink lg:hidden"
            aria-label={dict.a11y.mainNav}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        popover="auto"
        className="mobile-nav m-0 h-dvh max-h-none w-full max-w-none border-0 bg-ground p-0 text-ink lg:hidden"
      >
        <div className="shell flex h-[var(--header-h)] items-center justify-between border-b border-rule">
          <span className="font-semibold tracking-[-0.02em]">KINZEN</span>
          <button
            type="button"
            popoverTarget="mobile-nav"
            popoverTargetAction="hide"
            className="grid size-9 place-items-center text-ink-2 hover:text-ink"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav aria-label={dict.a11y.mainNav} className="shell">
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-rule">
                <a href={item.href} className="mobile-nav-link block py-4 text-2xl font-semibold tracking-[-0.03em]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
