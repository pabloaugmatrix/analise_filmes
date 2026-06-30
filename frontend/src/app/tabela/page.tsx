"use client";

import { useMovies } from "@/features/dashboard/MoviesContext";
import { useTable } from "@/features/dashboard/useTable";
import { FiltersBar } from "@/components/FiltersBar";
import { MovieTable } from "@/components/MovieTable";
import { AsyncState } from "@/components/AsyncState";

export default function TabelaPage() {
  const { movies, loading, error } = useMovies();
  const {
    allGenres,
    selectedGenres,
    yearBounds,
    yearStart,
    yearEnd,
    budgetOp,
    budgetValue,
    filtered,
    setYearStart,
    setYearEnd,
    setBudgetOp,
    setBudgetValue,
    toggleGenre,
    selectAllGenres,
    clearGenres,
    sorted,
    visible,
    sortKey,
    sortDir,
    search,
    setSearch,
    handleSort,
    loadMore,
    hasMore,
  } = useTable(movies);

  if (loading || error) {
    return <AsyncState loading={loading} error={error} />;
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="m-0 text-[1.8rem] font-semibold text-slate-50">
          Tabela de Dados
        </h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Consulta bruta dos filmes. Clique nas colunas para ordenar; a tabela
          carrega mais 20 ao rolar.
        </p>
      </header>

      <FiltersBar
        allGenres={allGenres}
        selectedGenres={selectedGenres}
        onToggleGenre={toggleGenre}
        onSelectAll={selectAllGenres}
        onClear={clearGenres}
        yearBounds={yearBounds}
        yearStart={yearStart}
        yearEnd={yearEnd}
        onYearStartChange={setYearStart}
        onYearEndChange={setYearEnd}
        budgetOp={budgetOp}
        budgetValue={budgetValue}
        onBudgetOpChange={setBudgetOp}
        onBudgetValueChange={setBudgetValue}
      />

      {/* Busca por nome + contador de resultados */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do filme..."
            className="input-dark w-full py-2 pl-9 pr-8 text-sm"
            aria-label="Buscar por nome"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#64748b] transition hover:text-slate-200"
              aria-label="Limpar busca"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          )}
        </div>
        <span className="shrink-0 text-xs text-[#64748b]">
          {sorted.length} de {filtered.length} filmes
        </span>
      </div>

      {sorted.length === 0 ? (
        <AsyncState loading={false} error={null} empty />
      ) : (
        <MovieTable
          rows={visible}
          total={sorted.length}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onLoadMore={loadMore}
          hasMore={hasMore}
        />
      )}
    </>
  );
}
