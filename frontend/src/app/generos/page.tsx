"use client";

import { useMovies } from "@/features/dashboard/MoviesContext";
import { useFilters } from "@/features/dashboard/useFilters";
import { FiltersBar } from "@/components/FiltersBar";
import { KpiRow } from "@/components/KpiRow";
import { ChartPanel } from "@/components/ChartPanel";
import { GenreRoiTimeline } from "@/components/charts/GenreRoiTimeline";
import { GenreMetricBarSwitcher } from "@/components/GenreMetricBarSwitcher";
import { GenreBudgetHeatmap } from "@/components/charts/GenreBudgetHeatmap";
import { DurationGenreLines } from "@/components/charts/DurationGenreLines";
import { AsyncState } from "@/components/AsyncState";

export default function GenerosPage() {
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

  if (loading || error) {
    return <AsyncState loading={loading} error={error} />;
  }

  return (
    <>
      <header className="mb-4">
        <h1 className="m-0 text-[1.8rem] font-semibold text-slate-50">
          Analise por Genero
        </h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Evolucao do ROI, receita e desempenho de cada genero ao longo dos anos
          (2006-2026)
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <ChartPanel
              title="Evolucao do ROI por Genero"
              desc="ROI real medio de cada genero ao decorrer dos anos - uma linha por genero."
              className="xl:col-span-3"
            >
              <GenreRoiTimeline data={filtered} allGenres={selectedGenres} />
            </ChartPanel>

            {/* Consolida ROI / Receita / Lucro / Nota por genero com 4 botoes */}
            <div className="lg:col-span-2 xl:col-span-3">
              <GenreMetricBarSwitcher data={filtered} />
            </div>

            <ChartPanel
              title="Genero x Orcamento (ROI)"
              desc="Heatmap do ROI medio combinando categoria e faixa de investimento."
              className="lg:col-span-2 xl:col-span-3"
            >
              <GenreBudgetHeatmap data={filtered} />
            </ChartPanel>

            {/* Novo grafico de duracao (responde P7/P8/P9) - no lugar do antigo Nota Media */}
            <div className="lg:col-span-2 xl:col-span-3">
              <DurationGenreLines data={filtered} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
