"use client";

import type { TabId } from "@/features/dashboard/types";

interface Props {
  tab: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  {
    id: "investor",
    label: "Investidores & Produtores",
    icon: <DollarIcon />,
  },
  {
    id: "analyst",
    label: "Analistas de Mercado",
    icon: <ChartIcon />,
  },
];

export function TabNav({ tab, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-ink-700 bg-ink-900 p-1">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-brand-500/20 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className={active ? "text-brand-400" : "text-slate-500"}>
              {t.icon}
            </span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function DollarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
