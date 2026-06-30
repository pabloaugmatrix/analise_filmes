import type { ReactNode } from "react";

interface Props {
  title: string;
  desc?: string;
  children: ReactNode;
  className?: string;
}

export function ChartPanel({ title, desc, children, className }: Props) {
  return (
    <section className={`card flex flex-col p-4 ${className ?? ""}`}>
      <header className="mb-2.5">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {desc ? <p className="mt-1 text-xs text-[#94a3b8]">{desc}</p> : null}
      </header>
      {children}
    </section>
  );
}
