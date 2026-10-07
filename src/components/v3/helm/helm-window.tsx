import type { CSSProperties } from "react";

/**
 * The Helm window mockup: real app structure (titlebar, workspace rail, launcher, 2x2 rack of
 * agent panes, command bar), FICTIONAL content (project "orchard", invented files and messages).
 * Purely decorative: the whole tree is aria-hidden and the scene's beat list is the text
 * equivalent.
 *
 * Everything is drawn in helm.css from the stage's `data-step` and its scroll position `--b`
 * (0..5, one unit per beat), so something moves on every scroll tick of every beat:
 *   0 the launcher fills in (folder typed, 4 panes picked, Create pressed),
 *   1 the four panes spawn one by one, 2 agents type in parallel at their own pace,
 *   3 Atlas writes a note that flies to Sable, 4 checks go green pane by pane and the merge lands.
 * A terminal line types over the window [a, a + len] of its own beat (`data-at`).
 */

type Line = {
  text: string;
  /** Phone wording: the phone window keeps every line short instead of shrinking the type. */
  short?: string;
  at: 2 | 3 | 4;
  tone?: "ok" | "note" | "dim";
  /** Hidden in the phone composition. */
  phone?: false;
  /** Fixed window inside its beat (steps 3 and 4); step 2 windows come from the pane's pace. */
  a?: number;
  len?: number;
};
type Pane = { sign: string; engine: string; pace: number; cmd: string; lines: Line[] };

const check = (i: number): Line => ({
  text: "✓ check passed",
  short: "✓ passed",
  at: 4,
  tone: "ok",
  a: 0.06 + i * 0.13,
  len: 0.1,
});

const PANES: Pane[] = [
  {
    sign: "Atlas",
    engine: "Claude Code",
    pace: 26,
    cmd: "claude",
    lines: [
      { text: "● Read src/slots/picker.ts", at: 2, phone: false },
      { text: "● Edit picker.ts  +18 −4", short: "● edit picker.ts", at: 2 },
      { text: "● Run tests  12 passed", short: "● 12 tests pass", at: 2, tone: "ok" },
      { text: "→ Sable: picker ready for review", short: "→ Sable: review", at: 3, tone: "note", a: 0.02, len: 0.2 },
      check(0),
    ],
  },
  {
    sign: "Nova",
    engine: "Codex",
    pace: 38,
    cmd: "codex",
    lines: [
      { text: "› plan: split SlotList rows", short: "› plan rows", at: 2 },
      { text: "› apply patch  slot-list.tsx", short: "› patch list", at: 2 },
      { text: "› lint  0 problems", at: 2, tone: "dim", phone: false },
      check(1),
    ],
  },
  {
    sign: "Vega",
    engine: "Kimi",
    pace: 46,
    cmd: "kimi",
    lines: [
      { text: "› read docs/booking.md", short: "› read docs", at: 2 },
      { text: "› write empty-state copy", short: "› write copy", at: 2 },
      { text: "› 3 strings updated", at: 2, tone: "dim", phone: false },
      check(2),
    ],
  },
  {
    sign: "Sable",
    engine: "Cursor",
    pace: 32,
    cmd: "cursor-agent",
    lines: [
      { text: "› review queue empty", short: "› queue empty", at: 2, tone: "dim" },
      { text: "← Atlas: picker ready for review", short: "← Atlas: review", at: 3, tone: "note", a: 0.74, len: 0.12 },
      { text: "› review picker.ts  0 comments", at: 3, phone: false, a: 0.87, len: 0.1 },
      check(3),
    ],
  },
];

/** Step 2: every pane starts almost at once and types at its own pace; all finish by 0.84. */
function step2Windows() {
  const gap = 220;
  const plan = PANES.map((pane, i) => {
    const start = 0.04 + i * 0.05;
    let t = 0;
    const spans = pane.lines.map((line) => {
      if (line.at !== 2) return null;
      const dur = [...line.text].length * pane.pace;
      const span = { from: t, dur };
      t += dur + gap;
      return span;
    });
    return { start, total: t - gap, spans };
  });
  const scale = Math.min(...plan.map((p) => (0.84 - p.start) / p.total));
  return plan.map((p) => p.spans.map((s) => (s ? { a: p.start + s.from * scale, len: s.dur * scale } : null)));
}
const STEP2 = step2Windows();

const vars = (v: Record<string, string | number>) => v as CSSProperties;

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={["hw-icon", className].filter(Boolean).join(" ")} fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON = {
  bell: "M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3L4 11ZM6.5 14h3",
  gear: "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1",
  expand: "M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9",
  close: "M4 4l8 8M12 4l-8 8",
  check: "M3.5 8.5 6.5 11.5 12.5 4.5",
  sparkle: "M8 2v3M8 11v3M2 8h3M11 8h3M4.2 4.2l1.6 1.6M10.2 10.2l1.6 1.6M4.2 11.8l1.6-1.6M10.2 5.8l1.6-1.6",
};

/** Text that types itself over [a, a + len] of beat `at` (scrubbed by scroll in helm.css). */
function Typed({
  as: Tag = "p",
  text,
  at,
  a,
  len,
  className,
  ...rest
}: {
  as?: "p" | "span";
  text: string;
  at: number;
  a: number;
  len: number;
  className?: string;
  "data-tone"?: string;
  "data-at"?: number;
  "data-variant"?: string;
}) {
  return (
    <Tag
      className={className}
      {...rest}
      style={vars({ "--chars": [...text].length, "--at": at, "--a": a.toFixed(3), "--len": len.toFixed(3) })}
    >
      {text}
    </Tag>
  );
}

export function HelmWindow() {
  return (
    <div className="hw" aria-hidden="true">
      <div className="hw-titlebar">
        <span className="hw-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="hw-vesper">
          <i className="hw-lamp" />
          Vesper
        </span>
        <span className="hw-crumb">
          orchard <b>/</b> space
        </span>
        <span className="hw-tools">
          <span className="hw-kbd">⌘K</span>
          <Icon d={ICON.bell} />
          <Icon d={ICON.gear} />
        </span>
      </div>

      <div className="hw-body">
        <div className="hw-rail">
          <p className="hw-label">Workspaces</p>
          <p className="hw-count">
            <span className="hw-swap">
              <b data-show="empty">0</b>
              <b data-show="open">4</b>
            </span>
            open terminals
          </p>
          <ul className="hw-spaces">
            <li className="hw-space is-active" style={vars({ "--hue": "var(--hw-indigo)" })}>
              <i className="hw-glyph" />
              <span>orchard</span>
              <span className="hw-swap hw-tag">
                <b data-show="idle">IDLE</b>
                <b data-show="working">WORKING</b>
                <b data-show="done">MERGED</b>
              </span>
            </li>
            <li className="hw-space" style={vars({ "--hue": "var(--hw-magenta)" })}>
              <i className="hw-glyph" />
              <span>tidepool</span>
            </li>
            <li className="hw-space" style={vars({ "--hue": "var(--hw-cyan)" })}>
              <i className="hw-glyph" />
              <span>lantern</span>
            </li>
          </ul>
          <span className="hw-mission">
            <b>+</b> new mission
          </span>
        </div>

        <div className="hw-rack">
          {/* Beat 1: the launcher fills itself in as the visitor scrolls. */}
          <div className="hw-launch">
            <p className="hw-launch-title">
              <Icon d={ICON.sparkle} />
              New workspace
            </p>
            <div className="hw-modes">
              <span className="hw-mode is-on">
                <b>Space</b> panes in a grid
              </span>
              <span className="hw-mode">
                <b>Swarm</b> a composed roster
              </span>
            </div>
            <p className="hw-path">
              <b>cd</b>
              <Typed as="span" text="~/projects/orchard" at={0} a={0.06} len={0.3} className="hw-typed hw-path-typed" />
            </p>
            <p className="hw-label hw-launch-label">How many terminals?</p>
            <div className="hw-tiles">
              {["1", "2", "4", "6"].map((n) => (
                <span key={n} className="hw-tile" data-pick={n === "4" || undefined}>
                  <span className="hw-tile-grid" data-n={n} />
                  {n}
                </span>
              ))}
            </div>
            <span className="hw-create">
              Create workspace <span className="hw-kbd">⌘↵</span>
            </span>
          </div>

          {PANES.map((pane, i) => (
            <div
              key={pane.sign}
              className="hw-pane"
              data-pane={pane.sign.toLowerCase()}
              style={vars({ "--i": i, "--done": (0.16 + i * 0.13).toFixed(2) })}
            >
              <div className="hw-head">
                <b className="hw-sign">{pane.sign}</b>
                <span className="hw-swap hw-state">
                  <b data-show="idle">IDLE</b>
                  <b data-show="working">WORKING</b>
                  <b data-show="done">
                    <Icon d={ICON.check} />
                    VERIFIED
                  </b>
                </span>
                <span className="hw-engine" data-live={i === 0 || undefined}>
                  {pane.engine}
                  {i === 0 ? <i /> : null}
                </span>
                <Icon d={ICON.expand} className="hw-head-icon" />
                <Icon d={ICON.close} className="hw-head-icon" />
              </div>
              <div className="hw-strip" />
              <div className="hw-term">
                <p className="hw-banner">helm · orchard</p>
                <p className="hw-prompt">
                  orchard <b>❯</b> {pane.cmd}
                </p>
                {pane.lines.map((line, n) => {
                  const w = line.at === 2 ? STEP2[i]?.[n] : { a: line.a ?? 0, len: line.len ?? 0.1 };
                  const timing = { at: line.at, a: w?.a ?? 0, len: w?.len ?? 0.1 };
                  const common = { className: "hw-line", "data-at": line.at, "data-tone": line.tone };
                  return line.short ? (
                    <div key={line.text} className="hw-line-pair">
                      <Typed {...common} {...timing} text={line.text} data-variant="full" />
                      <Typed {...common} {...timing} text={line.short} data-variant="short" />
                    </div>
                  ) : (
                    <Typed
                      key={line.text}
                      {...common}
                      {...timing}
                      text={line.text}
                      data-variant={line.phone === false ? "full" : undefined}
                    />
                  );
                })}
                <span className="hw-caret" />
              </div>
            </div>
          ))}

          <div className="hw-flight">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hw-arc">
              <path d="M46 28 Q78 8 70 54" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="hw-note">
              <span className="hw-note-route">
                Atlas <b>→</b> Sable
              </span>
              <span className="hw-note-body">picker.ts ready for review</span>
            </span>
          </div>

          <div className="hw-toast">
            <Icon d={ICON.check} />
            <span>
              Merged <b>feat/slot-picker</b> into main
            </span>
            <span className="hw-toast-meta">4 of 4 checks</span>
          </div>
        </div>
      </div>

      <div className="hw-command">
        <i className="hw-lamp" />
        <span className="hw-route">
          <span className="hw-swap">
            <b data-show="all">@all</b>
            <b data-show="peer">Atlas → Sable</b>
          </span>
        </span>
        <span className="hw-composer">
          <b>›</b>
          <span className="hw-swap">
            <span data-show="placeholder">Message the crew</span>
            <span data-show="typed">
              <Typed
                as="span"
                text="add a slot picker to booking, with tests"
                at={2}
                a={0}
                len={0.3}
                className="hw-typed"
              />
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
