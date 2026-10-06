import type { CSSProperties, ReactNode } from "react";
import type { Locale, Localized, LocalizedList } from "@/content/schema";
import type { PlateNode, PlateSpec, Point } from "./types";
import { PlateDraw } from "./plate-draw";
import "./plates.css";

export interface PlateLabels {
  region: string;
  hint: string;
  flow: string;
  constraints: string;
  to: string;
  drawing: string;
  scale: string;
  notToScale: string;
  revision: string;
  drawnBy: string;
}

const tx = (value: Localized, locale: Locale) => (locale === "th" && value.th) || value.en;
const txList = (value: LocalizedList, locale: Locale) => (locale === "th" && value.th) || value.en;

/** Stagger index for the draw-in; CSS turns it into a delay. */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

function polyline(points: readonly Point[]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
}

function arrowHead(points: readonly Point[], size = 8) {
  const [tx1, ty1] = points[points.length - 1];
  const [px, py] = points[points.length - 2];
  const len = Math.hypot(tx1 - px, ty1 - py) || 1;
  const dx = (tx1 - px) / len;
  const dy = (ty1 - py) / len;
  const bx = tx1 - dx * size;
  const by = ty1 - dy * size;
  const nx = -dy * (size * 0.55);
  const ny = dx * (size * 0.55);
  return `M${bx + nx} ${by + ny} L${tx1} ${ty1} L${bx - nx} ${by - ny}`;
}

function describe(spec: PlateSpec, locale: Locale, labels: PlateLabels) {
  const name = new Map(spec.nodes.map((n) => [n.id, tx(n.label, locale)]));
  const flow = spec.edges.map((e) => `${name.get(e.from)} ${labels.to} ${name.get(e.to)}`).join("; ");
  const constraints = spec.constraints.map((c) => txList(c.lines, locale).join(" ")).join("; ");
  return `${labels.flow}: ${flow}. ${labels.constraints}: ${constraints}.`;
}

function NodeText({ node, locale }: { node: PlateNode; locale: Locale }) {
  const label = tx(node.label, locale);
  const sub = node.sub ? txList(node.sub, locale) : [];
  if (node.container) {
    return (
      <text x={node.x + 14} y={node.y + 26} className="plate-label" data-fade>
        {label}
      </text>
    );
  }
  const total = 22 + sub.length * 18;
  const top = node.y + node.h / 2 - total / 2 + 16;
  const cx = node.x + node.w / 2;
  return (
    <text x={cx} y={top} textAnchor="middle" data-fade>
      <tspan className="plate-label">{label}</tspan>
      {sub.map((line, i) => (
        <tspan key={line} x={cx} y={top + 22 + i * 18} className="plate-sub">
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function Plate({
  spec,
  locale,
  labels,
  projectName,
  author,
  idPrefix,
  caption,
}: {
  spec: PlateSpec;
  locale: Locale;
  labels: PlateLabels;
  projectName: string;
  author: string;
  idPrefix: string;
  caption?: ReactNode;
}) {
  const titleId = `${idPrefix}-title`;
  const descId = `${idPrefix}-desc`;
  const title = tx(spec.title, locale);
  const tb = spec.titleBlock;
  let i = 0;

  return (
    <figure className="plate" aria-labelledby={`${idPrefix}-caption`}>
      <PlateDraw label={labels.region}>
        <svg
          viewBox={`0 0 ${spec.width} ${spec.height}`}
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="plate-svg"
          style={{ "--plate-w": spec.width } as CSSProperties}
        >
          <title id={titleId}>{`${spec.drawing}: ${title}`}</title>
          <desc id={descId}>{describe(spec, locale, labels)}</desc>

          {/* Sheet frame */}
          <rect
            x={8}
            y={8}
            width={spec.width - 16}
            height={spec.height - 16}
            className="plate-line"
            pathLength={1}
            data-draw
            style={order(i++)}
          />

          {spec.boundaries.map((b) => (
            <g key={b.id}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                className="plate-line plate-dash"
                data-fade
                style={order(i++)}
              />
              <text x={b.x + 12} y={b.y + 22} className="plate-sub" data-fade>
                {tx(b.label, locale)}
              </text>
            </g>
          ))}

          {spec.nodes.map((n) => (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                className="plate-line plate-box"
                pathLength={1}
                data-draw
                style={order(i++)}
              />
              {n.emphasis && (
                <rect
                  x={n.x + 5}
                  y={n.y + 5}
                  width={n.w - 10}
                  height={n.h - 10}
                  className="plate-line"
                  pathLength={1}
                  data-draw
                  style={order(i)}
                />
              )}
              <NodeText node={n} locale={locale} />
            </g>
          ))}

          {spec.edges.map((e) => (
            <g key={e.id}>
              <path d={polyline(e.points)} className="plate-line" pathLength={1} data-draw style={order(i++)} />
              {e.arrow !== "none" && (
                <path d={arrowHead(e.points)} className="plate-line" pathLength={1} data-draw style={order(i)} />
              )}
              {e.label && e.labelAt && (
                <text
                  x={e.labelAt[0]}
                  y={e.labelAt[1]}
                  textAnchor={e.labelAnchor ?? "start"}
                  className="plate-note plate-muted"
                  data-fade
                >
                  {tx(e.label, locale)}
                </text>
              )}
            </g>
          ))}

          {spec.constraints.map((c) => (
            <g key={c.id}>
              <path d={polyline(c.leader)} className="plate-line plate-leader" data-fade style={order(i++)} />
              <circle cx={c.leader[0][0]} cy={c.leader[0][1]} r={3} className="plate-line plate-dot" data-fade />
              <text x={c.at[0]} y={c.at[1]} className="plate-note" data-fade>
                {txList(c.lines, locale).map((line, li) => (
                  <tspan key={line} x={c.at[0]} y={c.at[1] + li * 19}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}

          {/* Title block */}
          <g>
            <rect
              x={tb.x}
              y={tb.y}
              width={tb.w}
              height={tb.h}
              className="plate-line"
              pathLength={1}
              data-draw
              style={order(i++)}
            />
            <path
              d={`M${tb.x} ${tb.y + 44} H${tb.x + tb.w} M${tb.x + 112} ${tb.y} V${tb.y + 44} M${tb.x + 112} ${tb.y + 44} V${tb.y + tb.h} M${tb.x + 224} ${tb.y + 44} V${tb.y + tb.h}`}
              className="plate-line"
              pathLength={1}
              data-draw
              style={order(i++)}
            />
            <g data-fade>
              <text x={tb.x + 10} y={tb.y + 15} className="plate-tiny">
                {labels.drawing}
              </text>
              <text x={tb.x + 10} y={tb.y + 36} className="plate-label plate-mono">
                {spec.drawing}
              </text>
              <text x={tb.x + 122} y={tb.y + 30} className="plate-label">
                {projectName}
              </text>
              <text x={tb.x + 10} y={tb.y + 59} className="plate-tiny">
                {labels.scale}
              </text>
              <text x={tb.x + 10} y={tb.y + 74} className="plate-sub">
                {labels.notToScale}
              </text>
              <text x={tb.x + 122} y={tb.y + 59} className="plate-tiny">
                {labels.revision}
              </text>
              <text x={tb.x + 122} y={tb.y + 74} className="plate-sub plate-mono">
                {spec.revision}
              </text>
              <text x={tb.x + 234} y={tb.y + 59} className="plate-tiny">
                {labels.drawnBy}
              </text>
              <text x={tb.x + 234} y={tb.y + 74} className="plate-sub">
                {author}
              </text>
            </g>
          </g>
        </svg>
      </PlateDraw>
      <figcaption id={`${idPrefix}-caption`} className="plate-caption">
        <span className="readout">{spec.drawing}</span>
        <span>{caption ?? title}</span>
        <span className="plate-hint" aria-hidden="true">
          {labels.hint}
        </span>
      </figcaption>
    </figure>
  );
}
