import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Locale } from "@/content/schema";
import { thaiBreaks } from "@/lib/thai";

/**
 * Open Graph cards in the site register: warm dark ground, ink, one gold accent,
 * the KINZEN wordmark. Satori cannot read CSS variables, so the dark-theme tokens
 * from globals.css are restated here as sRGB (converted from their oklch values).
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  ground: "#100e0c", // --ground (dark)
  ink: "#efebe2", // --ink (dark)
  ink2: "#afaaa3", // --ink-2 (dark)
  ink3: "#96918c", // --ink-3 (dark)
  rule: "#302d2a", // --rule (dark)
  gold: "#d7a955", // --gold (dark)
};

const FONT_DIR = join(process.cwd(), "assets", "fonts");

/** Static Google Sans instances, subset to Latin + Thai (Satori reads TTF, not woff2 or variable). */
async function fonts() {
  const [regular, semibold, bold, mono] = await Promise.all(
    ["GoogleSans-Regular.ttf", "GoogleSans-SemiBold.ttf", "GoogleSans-Bold.ttf", "GoogleSansCode-Regular.ttf"].map(
      (f) => readFile(join(FONT_DIR, f)),
    ),
  );
  return [
    { name: "Google Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Google Sans", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Google Sans", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Google Sans Code", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}

const SANS = "Google Sans";
// The code face has no Thai; Thai in a mono line falls through to Google Sans.
const MONO = "Google Sans Code, Google Sans";

function Dot({ live }: { live: boolean }) {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        background: live ? C.gold : "transparent",
        border: live ? "none" : `2px solid ${C.ink3}`,
        marginRight: 16,
      }}
    />
  );
}

export async function homeCard(input: { name: string; role: string; studio: string; city: string }) {
  // Page text carries word joiners; images need plain text with explicit Thai break points.
  const [name, role, studio, city] = [input.name, input.role, input.studio, input.city].map(thaiBreaks);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: C.ground,
        color: C.ink,
        padding: "52px 64px 56px",
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 26, color: C.ink3 }}>
        <span>kinzen.dev</span>
        <span style={{ fontFamily: SANS }}>{city}</span>
      </div>
      <div
        style={{
          display: "flex",
          // Ink 3.246em wide from 0.081em in (Google Sans 700, -0.05em): fills the 1072px measure.
          fontSize: 330,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          lineHeight: 0.8,
          marginLeft: -27,
        }}
      >
        KINZEN
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `2px solid ${C.rule}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 50, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{name}</div>
          <div style={{ fontSize: 32, color: C.ink2, marginTop: 6 }}>{role}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: C.ink2 }}>
          <Dot live />
          {studio}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}

export async function projectCard({
  locale,
  name,
  tagline,
  path,
  status,
  live,
  period,
  drawing,
}: {
  locale: Locale;
  name: string;
  tagline: string;
  path: string;
  status: string;
  live: boolean;
  period: string;
  drawing?: string;
}) {
  [name, tagline, status, period] = [name, tagline, status, period].map(thaiBreaks);
  if (drawing) drawing = thaiBreaks(drawing);
  // Fit long names on one line: Google Sans 600 averages ~0.56em per character.
  const nameSize = Math.min(140, Math.floor(1072 / (name.length * 0.56)));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: C.ground,
        color: C.ink,
        padding: "52px 64px 56px",
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em" }}>KINZEN</span>
        <span style={{ fontFamily: MONO, fontSize: 24, color: C.ink3 }}>{`kinzen.dev${path}`}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: nameSize, fontWeight: 600, letterSpacing: "-0.05em", lineHeight: 1 }}>{name}</div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            lineHeight: locale === "th" ? 1.5 : 1.3,
            color: C.ink2,
            marginTop: 28,
            maxWidth: 1000,
          }}
        >
          {tagline}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `2px solid ${C.rule}`,
          paddingTop: 26,
          fontSize: 28,
          color: C.ink2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <Dot live={live} />
          {status}
        </div>
        <div style={{ display: "flex", fontFamily: MONO, fontSize: 26 }}>
          <span>{period}</span>
          {drawing ? <span style={{ marginLeft: 40, color: C.ink3 }}>{drawing}</span> : null}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts() },
  );
}
