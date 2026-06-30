export type MetricId = "nota" | "roi" | "receita" | "lucro";

export interface MetricDef {
  id: MetricId;
  label: string;
  short: string;
}

// Ordem dos botoes conforme solicitado: Nota, ROI, Receita, Lucro
export const METRICS: MetricDef[] = [
  { id: "nota", label: "Nota Media (IMDb)", short: "Nota" },
  { id: "roi", label: "ROI Real Medio", short: "ROI" },
  { id: "receita", label: "Receita Real Media", short: "Receita" },
  { id: "lucro", label: "Lucro Real Medio", short: "Lucro" },
];

// Metricas cuja distribuicao justifica escala logaritmima (amplo range/outliers).
// Nota fica de fora (escala natural 0-10).
export function isLogMetric(metric: MetricId): boolean {
  return metric !== "nota";
}
