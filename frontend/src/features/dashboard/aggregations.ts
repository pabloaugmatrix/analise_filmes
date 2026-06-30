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
  "< 90 min",
  "90-110 min",
  "110-130 min",
  "130-150 min",
  "> 150 min",
] as const;

export function runtimeBucket(runtime: number): string {
  if (runtime < 90) return "< 90 min";
  if (runtime < 110) return "90-110 min";
  if (runtime < 130) return "110-130 min";
  if (runtime < 150) return "130-150 min";
  return "> 150 min";
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
