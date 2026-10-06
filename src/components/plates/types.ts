import type { Localized, LocalizedList } from "@/content/schema";

/**
 * A drawn architecture plate, described as data. Coordinates are in the plate's
 * own drawing units (the SVG viewBox); the renderer draws every line at one weight
 * and one projection (orthographic, not to scale).
 */
export type Point = readonly [number, number];

export interface PlateRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A component of the system: a box with a name and optional detail lines. */
export interface PlateNode extends PlateRect {
  id: string;
  label: Localized;
  sub?: LocalizedList;
  /** Drawn with a second inset outline: the part the drawing is about. */
  emphasis?: boolean;
  /** Label sits top-left (for containers holding other nodes) instead of centred. */
  container?: boolean;
}

/** A dashed enclosure: a host, a platform or a process boundary. */
export interface PlateBoundary extends PlateRect {
  id: string;
  label: Localized;
}

/** A connection, routed orthogonally through explicit points. */
export interface PlateEdge {
  id: string;
  /** Node ids, used to write the text description of the flow. */
  from: string;
  to: string;
  points: readonly Point[];
  arrow?: "end" | "none";
  label?: Localized;
  labelAt?: Point;
  labelAnchor?: "start" | "middle" | "end";
}

/** A real constraint, tied to the drawing by a dashed leader line. */
export interface PlateConstraint {
  id: string;
  /** Leader line from the anchor (on the drawing) to the label. */
  leader: readonly Point[];
  /** Baseline start of the first label line. */
  at: Point;
  lines: LocalizedList;
}

export interface PlateSpec {
  projectId: string;
  /** Drawing number in the site register, e.g. "KZ-01". */
  drawing: string;
  title: Localized;
  /** YYYY-MM, taken from the content's last-updated date. */
  revision: string;
  width: number;
  height: number;
  boundaries: PlateBoundary[];
  nodes: PlateNode[];
  edges: PlateEdge[];
  constraints: PlateConstraint[];
  titleBlock: PlateRect;
}
