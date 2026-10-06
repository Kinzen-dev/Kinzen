"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  ViewTransition,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { LedgerLabels, LedgerRow } from "./rows";
import { workTitleTransition } from "./transition";
import "./ledger.css";
import "./transitions.css";

type SortKey = "name" | "year";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

function sortRows(rows: LedgerRow[], sort: Sort) {
  if (!sort) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = sort.key === "name" ? a.name.localeCompare(b.name, "en") : a.start.localeCompare(b.start);
    return primary * sign || a.name.localeCompare(b.name, "en");
  });
}

function nextSort(current: Sort, key: SortKey): Sort {
  // Names start A to Z; years start newest first.
  const first = key === "name" ? "asc" : "desc";
  if (!current || current.key !== key) return { key, dir: first };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

function SortGlyph({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true" className="ledger-sort-glyph" data-dir={dir ?? undefined}>
      <path
        d={dir === "asc" ? "M2 6.5 5 3.5 8 6.5" : dir === "desc" ? "M2 3.5l3 3 3-3" : "M2 4 5 1 8 4M2 6l3 3 3-3"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function Status({ row }: { row: LedgerRow }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={row.live ? "size-1.5 rounded-full bg-gold" : "ledger-ring size-1.5 rounded-full border border-ink-3"}
      />
      {row.statusLabel}
    </span>
  );
}

export interface LedgerProps {
  rows: LedgerRow[];
  labels: LedgerLabels;
  areas: { id: LedgerRow["area"]; label: string; count: number }[];
  /** Server-rendered architecture plates, keyed by project id. */
  plates?: Record<string, ReactNode>;
  /** Pre-rendered icons keyed by project id (what a server component passes). */
  icons?: Record<string, ReactNode>;
  /** Icon slot for client callers. Renders nothing when absent. */
  renderIcon?: (projectId: string) => ReactNode;
}

export function Ledger({ rows, labels, areas, plates, icons, renderIcon }: LedgerProps) {
  const [sort, setSort] = useState<Sort>(null);
  const [filter, setFilter] = useState<LedgerRow["area"] | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const shownIds = sorted.filter((r) => filter === "all" || r.area === filter).map((r) => r.id);
  const activeId = focusId && shownIds.includes(focusId) ? focusId : shownIds[0];

  const focusRow = (id: string | undefined) => {
    if (!id) return;
    setFocusId(id);
    buttons.current.get(id)?.focus();
  };

  const router = useRouter();
  const toggle = (id: string) => {
    setFocusId(id);
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    // The shared-title morph only pairs when the project page is already in the router cache.
    // The panel's link often sits below the fold (no viewport prefetch), so warm it on open.
    const href = rows.find((r) => r.id === id)?.href;
    if (opening && href) router.prefetch(href);
  };

  const close = (id: string) => {
    setOpenId(null);
    focusRow(id);
  };

  const applyFilter = (next: LedgerRow["area"] | "all") => {
    setFilter(next);
    if (openId && next !== "all" && rows.find((r) => r.id === openId)?.area !== next) setOpenId(null);
  };

  const onRowKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = shownIds.indexOf(id);
    const move: Record<string, string | undefined> = {
      ArrowDown: shownIds[Math.min(index + 1, shownIds.length - 1)],
      ArrowUp: shownIds[Math.max(index - 1, 0)],
      Home: shownIds[0],
      End: shownIds[shownIds.length - 1],
    };
    if (event.key in move) {
      event.preventDefault();
      focusRow(move[event.key]);
    } else if (event.key === "Escape" && openId) {
      event.preventDefault();
      close(openId);
    }
  };

  const onRowClick = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if ((event.target as Element).closest("a, button")) return;
    toggle(id);
  };

  const showing = labels.showing.replace("{shown}", String(shownIds.length)).replace("{total}", String(rows.length));

  const sortButton = (key: SortKey, text: string, className = "") => {
    const dir = sort?.key === key ? sort.dir : null;
    return (
      <button type="button" className={`ledger-sort ${className}`} onClick={() => setSort((s) => nextSort(s, key))}>
        <span className="sr-only">{labels.sortBy} </span>
        {text}
        <SortGlyph dir={dir} />
      </button>
    );
  };

  const ariaSort = (key: SortKey) =>
    sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined;

  return (
    <div className="ledger">
      <div className="ledger-toolbar">
        <div className="ledger-pills">
          <div className="ledger-group" role="group" aria-label={labels.filterLabel}>
            {[{ id: "all" as const, label: labels.filterAll, count: rows.length }, ...areas].map((a) => (
              <button
                key={a.id}
                type="button"
                className="ledger-pill"
                aria-pressed={filter === a.id}
                onClick={() => applyFilter(a.id)}
              >
                {a.label}
                <span className="tabular ledger-pill-count">{a.count}</span>
              </button>
            ))}
          </div>
          {/* Phones have no column headers to sort by: the same sort lives here. */}
          <div className="ledger-group md:hidden" role="group" aria-label={labels.sortBy}>
            <span aria-hidden="true" className="ledger-pill-rule" />
            {sortButton("name", labels.name, "ledger-pill")}
            {sortButton("year", labels.year, "ledger-pill")}
          </div>
        </div>
        <p className="readout ledger-count" aria-live="polite">
          {showing}
        </p>
      </div>

      <table className="ledger-table">
        <caption className="sr-only">{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort("name")}>
              {/* Phones sort from the pill row above; one control per job at every width. */}
              <span className="md:hidden">{labels.name}</span>
              {sortButton("name", labels.name, "hidden md:inline-flex")}
            </th>
            <th scope="col" className="hidden md:table-cell">
              {labels.area}
            </th>
            <th scope="col" className="hidden lg:table-cell">
              {labels.stack}
            </th>
            <th scope="col" className="hidden md:table-cell" aria-sort={ariaSort("year")}>
              {sortButton("year", labels.year)}
            </th>
            <th scope="col" className="hidden md:table-cell">
              {labels.status}
            </th>
            <th scope="col" className="ledger-toggle-col">
              <span className="sr-only">{labels.details}</span>
            </th>
          </tr>
        </thead>
        <tbody data-reveal-group>
          {sorted.map((row) => {
            const shown = shownIds.includes(row.id);
            const open = shown && openId === row.id;
            const panelId = `ledger-${row.id}-panel`;
            const icon = icons?.[row.id] ?? renderIcon?.(row.id) ?? null;
            return (
              <Fragment key={row.id}>
                <tr
                  className="ledger-row"
                  data-filtered={shown ? undefined : ""}
                  data-open={open ? "" : undefined}
                  aria-hidden={shown ? undefined : true}
                  onClick={shown ? (e) => onRowClick(e, row.id) : undefined}
                >
                  <th scope="row" className="ledger-name-cell">
                    <div className="flex items-start gap-3">
                      {icon ? (
                        <span className="ledger-icon" aria-hidden="true">
                          {icon}
                        </span>
                      ) : null}
                      <div className="min-w-0">
                        <button
                          ref={(el) => {
                            if (el) buttons.current.set(row.id, el);
                            else buttons.current.delete(row.id);
                          }}
                          type="button"
                          className="ledger-name"
                          tabIndex={shown && row.id === activeId ? 0 : -1}
                          aria-expanded={open}
                          aria-controls={open ? panelId : undefined}
                          onClick={() => toggle(row.id)}
                          onKeyDown={(e) => onRowKey(e, row.id)}
                          onFocus={() => setFocusId(row.id)}
                        >
                          <ViewTransition name={workTitleTransition(row.slug)} share="morph" default="none">
                            <span className="inline-block">{row.name}</span>
                          </ViewTransition>
                        </button>
                        <span className="mt-1 block max-w-[52ch] text-sm text-ink-2">{row.tagline}</span>
                        <span className="ledger-meta md:hidden">
                          <Status row={row} />
                          <span className="readout">{row.year}</span>
                          <span className="text-ink-2">{row.areaLabel}</span>
                        </span>
                      </div>
                    </div>
                  </th>
                  <td className="hidden text-sm text-ink-2 md:table-cell">{row.areaLabel}</td>
                  <td className="readout hidden max-w-[28ch] lg:table-cell">{row.stack.slice(0, 4).join(", ")}</td>
                  <td className="readout hidden whitespace-nowrap md:table-cell">{row.year}</td>
                  <td className="hidden text-sm md:table-cell">
                    <Status row={row} />
                  </td>
                  <td className="ledger-toggle-col">
                    <span className="ledger-toggle" aria-hidden="true" />
                  </td>
                </tr>
                {open && (
                  <tr className="ledger-panel-row">
                    <td colSpan={6} id={panelId}>
                      <div
                        className="ledger-panel"
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            close(row.id);
                          }
                        }}
                      >
                        <div className="md:col-span-7">
                          <h3 className="ledger-panel-label">{labels.outcomes}</h3>
                          <ul className="mt-3 grid gap-3">
                            {row.outcomes.map((o) => (
                              <li key={o} className="flex max-w-[64ch] gap-3">
                                <span aria-hidden="true" className="mt-[0.8em] h-px w-3 shrink-0 bg-ink-3" />
                                <span>{o}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid content-start gap-6 md:col-span-4 md:col-start-9">
                          {/* Near the top, so the row title is still on screen when this is clicked:
                              the shared-title morph only pairs elements inside the viewport. */}
                          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                            <Link href={row.href} className="ledger-cta">
                              {labels.openProject}
                              <span aria-hidden="true"> →</span>
                            </Link>
                            <button type="button" className="ledger-close" onClick={() => close(row.id)}>
                              {labels.close}
                            </button>
                          </div>
                          <dl className="grid content-start gap-5">
                            <div>
                              <dt className="ledger-panel-label">{labels.role}</dt>
                              <dd className="mt-1">{row.role}</dd>
                            </div>
                            <div>
                              <dt className="ledger-panel-label">{labels.stack}</dt>
                              <dd className="readout mt-1">{row.stack.join(", ")}</dd>
                            </div>
                            {row.links.length > 0 && (
                              <div>
                                <dt className="ledger-panel-label">{labels.links}</dt>
                                <dd className="mt-1 grid gap-1">
                                  {row.links.map((l) => (
                                    <a key={l.href} href={l.href} className="link" rel="noopener" target="_blank">
                                      {l.label}
                                    </a>
                                  ))}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                        {plates?.[row.id] ? <div className="min-w-0 md:col-span-12">{plates[row.id]}</div> : null}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
