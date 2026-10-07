export type TileId = "line" | "stt" | "ts" | "model" | "guard" | "reply";

/** Neutral line glyphs (no brand marks: the logo work lives elsewhere). 20px, one stroke weight. */
export function Glyph({ id }: { id: TileId }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg className="asm-glyph" viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
      {id === "line" && <path {...p} d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v7c0 1.4-1.1 2.5-2.5 2.5H10l-4 4v-4h0.5" />}
      {id === "stt" && <path {...p} d="M4 12v0M7.5 9v6M11 6v12M14.5 9v6M18 11v2M20.5 12v0" />}
      {id === "ts" && <path {...p} d="M8 4C6 4 6 5.5 6 7.5S5 11 3.5 12C5 13 6 14.5 6 16.5S6 20 8 20M16 4c2 0 2 1.5 2 3.5S19 11 20.5 12C19 13 18 14.5 18 16.5S18 20 16 20" />}
      {id === "model" && (
        <g {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
        </g>
      )}
      {id === "guard" && <path {...p} d="M12 3l7 3v5.5c0 4.3-3 7.8-7 9.5-4-1.7-7-5.2-7-9.5V6l7-3zM9 12l2.2 2.2L15.5 10" />}
      {id === "reply" && <path {...p} d="M20 4L10 14M20 4l-6 16-4-6-6-4 16-6z" />}
    </svg>
  );
}
