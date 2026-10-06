import type { ReactNode } from "react";

export function SectionHeader({ id, title, intro }: { id: string; title: string; intro?: ReactNode }) {
  return (
    <header data-reveal className="grid gap-4 border-t border-rule-strong pt-5 pb-10 md:grid-cols-12 md:gap-6 md:pb-14">
      <h2 id={`${id}-title`} className="text-2xl tracking-[-0.045em] md:col-span-6">
        {title}
      </h2>
      {intro ? <p className="max-w-[46ch] text-ink-2 md:col-span-5 md:col-start-8 md:self-end">{intro}</p> : null}
    </header>
  );
}
