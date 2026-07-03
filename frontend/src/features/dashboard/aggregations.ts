import type { Movie } from "./types";

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

// Faixas de orcamento (reais) - usadas no heatmap Genero x Orcamento
export const BUDGET_BUCKETS = [
  "Baixo (< $20M)",
  "Medio ($20M-$100M)",
  "Blockbuster (> $100M)",
] as const;

export function budgetBucket(budgetReal: number): string {
  const m = budgetReal / 1e6;
  if (m < 20) return "Baixo (< $20M)";
  if (m <= 100) return "Medio ($20M-$100M)";
  return "Blockbuster (> $100M)";
}

// Faixas de duracao (runtime) - usadas nas analises por duracao (P7/P8/P9)
export const RUNTIME_BUCKETS = [
  "< 80 min",
  "80-95 min",
  "95-110 min",
  "110-125 min",
  "125-140 min",
  "140-160 min",
  "> 160 min",
] as const;

export function runtimeBucket(runtime: number): string {
  if (runtime < 80) return "< 80 min";
  if (runtime < 95) return "80-95 min";
  if (runtime < 110) return "95-110 min";
  if (runtime < 125) return "110-125 min";
  if (runtime < 140) return "125-140 min";
  if (runtime < 160) return "140-160 min";
  return "> 160 min";
}

// Faixas das metricas continuas, usadas como eixo X categorico no grafico de
// linhas por genero (cruzamento de variaveis).
export const NOTA_BUCKETS = ["0","1","2","3","4","5","6","7","8","9","10"] as const;
export const ROI_BUCKETS = [
  "< 0%",
  "0-50%",
  "50-100%",
  "100-300%",
  "300-600%",
  "600-1000%",
  "> 1000%",
] as const;
export const RECEITA_BUCKETS = [
  "< $30M",
  "$30-80M",
  "$80-150M",
  "$150-300M",
  "$300-500M",
  "$500-800M",
  "> $800M",
] as const;
export const LUCRO_BUCKETS = [
  "< $0",
  "$0-50M",
  "$50-150M",
  "$150-300M",
  "$300-500M",
  "$500-800M",
  "> $800M",
] as const;

export function notaBucket(v: number): string {
  return String(Math.min(10, Math.max(0, Math.floor(v))));
}

export function roiBucket(roi: number): string {
  const pct = roi * 100;
  if (pct < 0) return "< 0%";
  if (pct <= 50) return "0-50%";
  if (pct <= 100) return "50-100%";
  if (pct <= 300) return "100-300%";
  if (pct <= 600) return "300-600%";
  if (pct <= 1000) return "600-1000%";
  return "> 1000%";
}

export function receitaBucket(v: number): string {
  const m = v / 1e6;
  if (m < 30) return "< $30M";
  if (m <= 80) return "$30-80M";
  if (m <= 150) return "$80-150M";
  if (m <= 300) return "$150-300M";
  if (m <= 500) return "$300-500M";
  if (m <= 800) return "$500-800M";
  return "> $800M";
}

export function lucroBucket(v: number): string {
  const m = v / 1e6;
  if (m < 0) return "< $0";
  if (m <= 50) return "$0-50M";
  if (m <= 150) return "$50-150M";
  if (m <= 300) return "$150-300M";
  if (m <= 500) return "$300-500M";
  if (m <= 800) return "$500-800M";
  return "> $800M";
}

// Operador de comparacao para o filtro de orcamento
export type BudgetOp = "any" | "gte" | "lte";

export interface Filters {
  selectedGenres: string[];
  yearStart: number;
  yearEnd: number;
  budgetOp: BudgetOp;
  budgetValue: number; // em milhoes de dolares ($M)
}

export function applyFilters(movies: Movie[], filters: Filters): Movie[] {
  const { selectedGenres, yearStart, yearEnd, budgetOp, budgetValue } = filters;
  // Garante intervalo valido mesmo se o usuario inverter os anos
  const lo = Math.min(yearStart, yearEnd);
  const hi = Math.max(yearStart, yearEnd);
  const budgetThreshold = budgetValue * 1e6;

  return movies.filter((m) => {
    // Genero: lista de inclusao (vazio => nada selecionado => nenhum filme)
    if (!selectedGenres.includes(m.genre_primary)) return false;
    if (m.ano_lancamento < lo || m.ano_lancamento > hi) return false;
    if (budgetOp === "gte" && m.budget_real < budgetThreshold) return false;
    if (budgetOp === "lte" && m.budget_real > budgetThreshold) return false;
    return true;
  });
}
