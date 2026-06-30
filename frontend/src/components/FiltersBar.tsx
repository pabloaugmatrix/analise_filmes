"use client";

import type { BudgetOp } from "@/features/dashboard/aggregations";

interface Props {
  allGenres: string[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  yearBounds: [number, number];
  yearStart: number;
  yearEnd: number;
  onYearStartChange: (year: number) => void;
  onYearEndChange: (year: number) => void;
  budgetOp: BudgetOp;
  budgetValue: number;
  onBudgetOpChange: (op: BudgetOp) => void;
  onBudgetValueChange: (value: number) => void;
}

// Barra de filtros fixa (sticky) abaixo da navbar.
// Generos em linha com rolagem horizontal; periodo e orcamento inline.
export function FiltersBar({
  allGenres,
  selectedGenres,
  onToggleGenre,
  onSelectAll,
  onClear,
  yearBounds,
  yearStart,
  yearEnd,
  onYearStartChange,
  onYearEndChange,
  budgetOp,
  budgetValue,
  onBudgetOpChange,
  onBudgetValueChange,
}: Props) {
  const [minYear, maxYear] = yearBounds;

  return (
    <div className="sticky top-16 z-40 mb-6 border-b border-line bg-card/95 px-4 py-3 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)] backdrop-blur-md md:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
        {/* Genero: linha com rolagem horizontal (compacta para o sticky) */}
        <div className="flex min-w-0 items-center gap-2 xl:flex-1">
          <span className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Genero
          </span>
          <div className="flex shrink-0 gap-1 text-[0.7rem]">
            <button
              type="button"
              onClick={onSelectAll}
              className="font-medium text-[#94a3b8] transition hover:text-accent"
            >
              Todos
            </button>
            <span className="text-[#475569]">/</span>
            <button
              type="button"
              onClick={onClear}
              className="font-medium text-[#94a3b8] transition hover:text-accent"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
            {allGenres.map((g) => {
              const active = selectedGenres.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onToggleGenre(g)}
                  className={`chip shrink-0 whitespace-nowrap ${active ? "chip-active" : ""}`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Periodo + Orcamento inline */}
        <div className="flex shrink-0 flex-wrap items-end gap-5">
          <ControlGroup label="Periodo">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={minYear}
                max={maxYear}
                value={yearStart}
                onChange={(e) => onYearStartChange(Number(e.target.value))}
                className="input-dark w-[72px] px-2 py-1.5"
                aria-label="Ano inicial"
              />
              <span className="text-[#64748b]">-</span>
              <input
                type="number"
                min={minYear}
                max={maxYear}
                value={yearEnd}
                onChange={(e) => onYearEndChange(Number(e.target.value))}
                className="input-dark w-[72px] px-2 py-1.5"
                aria-label="Ano final"
              />
            </div>
          </ControlGroup>

          <ControlGroup label="Orcamento">
            <div className="flex items-center gap-1.5">
              <select
                value={budgetOp}
                onChange={(e) => onBudgetOpChange(e.target.value as BudgetOp)}
                className="select-dark min-w-[140px] py-1.5 text-xs"
              >
                <option value="any">Qualquer</option>
                <option value="gte">Maior ou igual (≥)</option>
                <option value="lte">Menor ou igual (≤)</option>
              </select>
              <input
                type="number"
                min={0}
                step={10}
                value={budgetValue}
                onChange={(e) => onBudgetValueChange(Number(e.target.value))}
                disabled={budgetOp === "any"}
                className="input-dark w-[68px] px-2 py-1.5 disabled:opacity-40"
                aria-label="Valor do orcamento"
              />
              <span className="text-xs text-[#94a3b8]">$M</span>
            </div>
          </ControlGroup>
        </div>
      </div>
    </div>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </label>
      {children}
    </div>
  );
}
