import type { CSSProperties } from "react";

/**
 * The Helm window mockup: real app structure (titlebar, workspace rail, 2x2 rack of agent panes,
 * command bar), FICTIONAL content (project "orchard", invented files and messages). Purely
 * decorative: the whole tree is aria-hidden and the scene's beat list is the text equivalent.
 *
 * Everything is drawn from the stage's `data-step` in helm.css:
 *   0 empty rack, 1 panes spawn, 2 agents type in parallel, 3 a note travels Atlas -> Sable,
 *   4 checks go green and the merge lands.
 * A terminal line carries `data-at` (the step it appears in) and its own typing duration and
 * delay, so the four panes type at different speeds without any script.
 */

type Line = { text: string; at: 2 | 3 | 4; tone?: "ok" | "note" | "dim"; phone?: false };
type Pane = {
  sign: string;
  engine: string;
  /** ms per character: each agent types at its own pace. */
  pace: number;
  cmd: string;
  lines: Line[];
};

const PANES: Pane[] = [
  {
    sign: "Atlas",
    engine: "Claude Code",
    pace: 26,
    cmd: "claude",
    lines: [
      { text: "● Read src/slots/picker.ts", at: 2, phone: false },
      { text: "● Edit picker.ts  +18 −4", at: 2 },
      { text: "● Run tests  12 passed", at: 2, tone: "ok" },
      { text: "→ Sable: picker ready for review", at: 3, tone: "note" },
      { text: "✓ check passed", at: 4, tone: "ok" },
    ],
  },
  {
    sign: "Nova",
    engine: "Codex",
    pace: 38,
    cmd: "codex",
    lines: [
      { text: "› plan: split SlotList rows", at: 2 },
      { text: "› apply patch  slot-list.tsx", at: 2 },
      { text: "› lint  0 problems", at: 2, tone: "dim", phone: false },
      { text: "✓ check passed", at: 4, tone: "ok" },
    ],
  },
  {
    sign: "Vega",
    engine: "Kimi",
    pace: 46,
    cmd: "kimi",
    lines: [
      { text: "› read docs/booking.md", at: 2 },
      { text: "› write empty-state copy", at: 2 },
      { text: "› 3 strings updated", at: 2, tone: "dim", phone: false },
      { text: "✓ check passed", at: 4, tone: "ok" },
    ],
  },
  {
    sign: "Sable",
    engine: "Cursor",
    pace: 32,
    cmd: "cursor-agent",
    lines: [
      { text: "› review queue empty", at: 2, tone: "dim" },
      { text: "← Atlas: picker ready for review", at: 3, tone: "note" },
      { text: "› review picker.ts  0 comments", at: 3, phone: false },
      { text: "✓ check passed", at: 4, tone: "ok" },
    ],
  },
];

/** Lines of one step type one after another inside a pane; each step starts its own clock. */
function timeLines(pane: Pane, index: number) {
  const clock: Record<number, number> = { 2: 260 + index * 180, 3: 1500, 4: 120 + index * 140 };
  return pane.lines.map((line) => {
    const chars = [...line.text].length;
    const dur = chars * pane.pace;
    const delay = clock[line.at] ?? 0;
    clock[line.at] = delay + dur + 220;
    return { ...line, chars, dur, delay };
  });
}

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
  grid: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  check: "M3.5 8.5 6.5 11.5 12.5 4.5",
};

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
          <div className="hw-empty">
            <Icon d={ICON.grid} className="hw-empty-icon" />
            <span>No terminals yet</span>
            <span className="hw-mission hw-mission-cta">
              <b>+</b> new mission <span className="hw-kbd">⌘N</span>
            </span>
          </div>

          {PANES.map((pane, i) => (
            <div key={pane.sign} className="hw-pane" data-pane={pane.sign.toLowerCase()} style={vars({ "--i": i })}>
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
                <p className="hw-prompt" data-phone="hide">
                  orchard <b>❯</b> {pane.cmd}
                </p>
                {timeLines(pane, i).map((line) => (
                  <p
                    key={line.text}
                    className="hw-line"
                    data-at={line.at}
                    data-tone={line.tone}
                    data-phone={line.phone === false ? "hide" : undefined}
                    style={vars({ "--chars": line.chars, "--dur": `${line.dur}ms`, "--delay": `${line.delay}ms` })}
                  >
                    {line.text}
                  </p>
                ))}
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
              <span className="hw-typed">add a slot picker to booking, with tests</span>
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
