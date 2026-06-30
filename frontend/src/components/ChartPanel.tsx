import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  flush?: boolean;
  children: ReactNode;
}

export function ChartPanel({ title, subtitle, flush, children }: Props) {
  return (
    <section className="panel flex flex-col">
      <header className={`border-b border-ink-700 ${flush ? "px-4 py-3" : "px-5 py-4"}`}>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </header>
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}
