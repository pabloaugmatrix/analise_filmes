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

// Dimensoes disponiveis para o eixo X do grafico de linhas por genero.
// "duracao" preserva a analise original (P7-P9); as demais metricas permitem
// cruzar variaveis (ex.: receita x nota -> P5).
export type XDim = "duracao" | MetricId;

export interface XDimDef {
  id: XDim;
  label: string;
  short: string;
}

export const X_DIMS: XDimDef[] = [
  { id: "duracao", label: "Duracao", short: "Duracao" },
  { id: "nota", label: "Nota", short: "Nota" },
  { id: "roi", label: "ROI Real", short: "ROI" },
  { id: "receita", label: "Receita Real", short: "Receita" },
  { id: "lucro", label: "Lucro Real", short: "Lucro" },
];
