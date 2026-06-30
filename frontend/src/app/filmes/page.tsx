"use client";

import { useMemo } from "react";

import { useMovies } from "@/features/dashboard/MoviesContext";
import { useFilters } from "@/features/dashboard/useFilters";
import { FiltersBar } from "@/components/FiltersBar";
import { KpiRow } from "@/components/KpiRow";
import { ChartPanel } from "@/components/ChartPanel";
import { BudgetRevenueScatter } from "@/components/charts/BudgetRevenueScatter";
import { VoteProfitScatter } from "@/components/charts/VoteProfitScatter";
import { RuntimeRoiScatter } from "@/components/charts/RuntimeRoiScatter";
import { TopMoviesTable } from "@/components/TopMoviesTable";
import { AsyncState } from "@/components/AsyncState";

export default function FilmesPage() {
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
    kpis,
    setYearStart,
    setYearEnd,
    setBudgetOp,
    setBudgetValue,
    toggleGenre,
    selectAllGenres,
    clearGenres,
  } = useFilters(movies);

  const topMovies = useMemo(
    () => [...filtered].sort((a, b) => b.lucro_real - a.lucro_real).slice(0, 20),
    [filtered]
  );

  if (loading || error) {
    return <AsyncState loading={loading} error={error} />;
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="m-0 text-[1.8rem] font-semibold text-slate-50">
          Analise por Filme
        </h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Desempenho individual: orcamento x receita, avaliacao e duracao de cada
          titulo
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

      {filtered.length === 0 ? (
        <AsyncState loading={false} error={null} empty />
      ) : (
        <>
          <KpiRow kpis={kpis} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartPanel
              title="Orcamento x Receita (Lucro)"
              desc="Cada bolha e um filme (tamanho = lucro real, cor = genero). Linha tracejada = tendencia OLS."
              className="xl:col-span-2"
            >
              <BudgetRevenueScatter data={filtered} allGenres={selectedGenres} />
            </ChartPanel>

            <ChartPanel
              title="Nota do Publico x Lucro Real"
              desc="Filmes melhor avaliados tendem a gerar maior lucro? (linha tracejada = tendencia OLS)"
            >
              <VoteProfitScatter data={filtered} allGenres={selectedGenres} />
            </ChartPanel>

            <ChartPanel
              title="Duracao x ROI (cor = nota)"
              desc="Impacto da duracao no sucesso financeiro e nas avaliacoes."
            >
              <RuntimeRoiScatter data={filtered} />
            </ChartPanel>

            <ChartPanel
              title="Top 20 - Maiores Lucros Reais"
              desc="Ranking dos filmes mais lucrativos apos os filtros."
              className="xl:col-span-2"
            >
              <TopMoviesTable movies={topMovies} />
            </ChartPanel>
          </div>
        </>
      )}
    </>
  );
}
