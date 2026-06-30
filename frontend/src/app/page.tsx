"use client";

import { useDashboard } from "@/features/dashboard/useDashboard";
import { Sidebar } from "@/components/Sidebar";
import { KpiRow } from "@/components/KpiRow";
import { TabNav } from "@/components/TabNav";
import { InvestorTab } from "@/components/InvestorTab";
import { AnalystTab } from "@/components/AnalystTab";

export default function DashboardPage() {
  const {
    loading,
    error,
    filtered,
    allGenres,
    yearBounds,
    selectedGenres,
    yearRange,
    tab,
    kpis,
    genreStats,
    topMovies,
    setYearRange,
    setTab,
    handleToggleGenre,
    handleSelectAllGenres,
    handleClearGenres,
    handleResetFilters,
  } = useDashboard();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        allGenres={allGenres}
        selectedGenres={selectedGenres}
        yearBounds={yearBounds}
        yearRange={yearRange}
        totalFilmes={kpis.totalFilmes}
        onToggleGenre={handleToggleGenre}
        onSelectAll={handleSelectAllGenres}
        onClear={handleClearGenres}
        onYearRangeChange={setYearRange}
        onReset={handleResetFilters}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-700 bg-ink-900/60 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">
              Cinema Analytics Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Suporte a decisao estrategica e analise financeira (ultimos 20 anos)
            </p>
          </div>
          <TabNav tab={tab} onChange={setTab} />
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {error ? (
            <StatusCard
              tone="error"
              title="Erro ao carregar os dados"
              message={error}
            />
          ) : loading ? (
            <StatusCard tone="loading" title="Carregando base analitica..." message="Lendo a camada Trusted." />
          ) : (
            <>
              <KpiRow kpis={kpis} />

              {filtered.length === 0 ? (
                <StatusCard
                  tone="empty"
                  title="Nenhum filme no filtro atual"
                  message="Ajuste os filtros na barra lateral para ver os graficos."
                />
              ) : tab === "investor" ? (
                <InvestorTab
                  filtered={filtered}
                  allGenres={allGenres}
                  genreStats={genreStats}
                />
              ) : (
                <AnalystTab
                  filtered={filtered}
                  allGenres={allGenres}
                  topMovies={topMovies}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusCard({
  tone,
  title,
  message,
}: {
  tone: "error" | "loading" | "empty";
  title: string;
  message: string;
}) {
  const toneClass =
    tone === "error"
      ? "border-rose-500/40 bg-rose-500/5"
      : tone === "loading"
      ? "border-brand-500/40 bg-brand-500/5"
      : "border-ink-700 bg-ink-900";
  return (
    <div className={`panel flex flex-col items-center justify-center gap-2 px-6 py-16 text-center ${toneClass}`}>
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <p className="max-w-md text-xs text-slate-400">{message}</p>
    </div>
  );
}
