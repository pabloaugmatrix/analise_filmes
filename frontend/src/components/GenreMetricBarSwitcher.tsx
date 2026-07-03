"use client";

import { useState } from "react";

import type { Movie } from "@/features/dashboard/types";
import type { MetricId } from "@/features/dashboard/metrics";
import { MetricTabs } from "@/components/MetricTabs";
import { GenreMetricBar } from "@/components/charts/GenreMetricBar";
import { METRICS, isLogMetric } from "@/features/dashboard/metrics";

interface Props {
  data: Movie[];
}

// Consolida os antigos 4 graficos de barras (ROI/Receita/Lucro/Nota por genero)
// em um so, com 4 botoes para escolher a metrica exibida.
export function GenreMetricBarSwitcher({ data }: Props) {
  const [metric, setMetric] = useState<MetricId>("roi");
  const def = METRICS.find((m) => m.id === metric);

  return (
    <section className="card flex flex-col p-4">
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {def?.label ?? "Metrica"} por Genero
          </h3>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Selecione a metrica para comparar os generos
            {isLogMetric(metric) ? " (escala logaritmica no eixo Y)" : ""}.
          </p>
        </div>
        <MetricTabs value={metric} onChange={setMetric} />
      </header>
      <GenreMetricBar data={data} metric={metric} />
    </section>
  );
}
