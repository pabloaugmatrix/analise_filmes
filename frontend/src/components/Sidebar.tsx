"use client";

import { META } from "@/features/dashboard/types";
import { YearRangeFilter } from "./YearRangeFilter";

interface Props {
  allGenres: string[];
  selectedGenres: string[];
  yearBounds: [number, number];
  yearRange: [number, number];
  totalFilmes: number;
  onToggleGenre: (genre: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onYearRangeChange: (value: [number, number]) => void;
  onReset: () => void;
}

export function Sidebar({
  allGenres,
  selectedGenres,
  yearBounds,
  yearRange,
  totalFilmes,
  onToggleGenre,
  onSelectAll,
  onClear,
  onYearRangeChange,
  onReset,
}: Props) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-ink-700 bg-ink-900">
      <div className="flex items-center gap-2 border-b border-ink-700 px-5 py-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/20 text-brand-400">
          <FilmIcon />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-100">Cinema Analytics</p>
          <p className="text-[11px] text-slate-500">Painel de decisao</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Genero Principal
            </h2>
            <div className="flex gap-2 text-[11px] text-slate-400">
              <button onClick={onSelectAll} className="hover:text-brand-400">Todos</button>
              <span className="text-slate-600">/</span>
              <button onClick={onClear} className="hover:text-brand-400">Limpar</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allGenres.map((g) => {
              const active = selectedGenres.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => onToggleGenre(g)}
                  className={`chip ${active ? "chip-active" : ""}`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Periodo de Lancamento
          </h2>
          <YearRangeFilter
            min={yearBounds[0]}
            max={yearBounds[1]}
            value={yearRange}
            onChange={onYearRangeChange}
          />
        </section>

        <section className="rounded-lg border border-ink-700 bg-ink-850 p-3 text-[11px] text-slate-400">
          <p className="mb-1 font-semibold text-slate-300">Metas estrategicas</p>
          <p>ROI &gt; {META.roiPct}% &middot; Assertividade &gt; {META.assertividadePct}% &middot; Receita &gt; ${META.receitaMediaMilhoes}M</p>
        </section>
      </div>

      <div className="border-t border-ink-700 px-5 py-4">
        <button
          onClick={onReset}
          className="w-full rounded-lg border border-ink-600 bg-ink-800 py-2 text-xs font-medium text-slate-300 transition hover:border-brand-500 hover:text-white"
        >
          Resetar filtros
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          {totalFilmes.toLocaleString("pt-BR")} filmes no filtro
        </p>
      </div>
    </aside>
  );
}

function FilmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="17" x2="22" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
    </svg>
  );
}
