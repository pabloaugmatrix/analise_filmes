"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { applyFilters, mean, median, type BudgetOp, type Filters } from "./aggregations";
import { META, type Kpis } from "./types";

export function useFilters(movies: ReturnType<typeof Array.prototype.slice>) {
  const allGenres = useMemo(
    () => Array.from(new Set(movies.map((m) => m.genre_primary))).sort(),
    [movies]
  );

  const yearBounds = useMemo<[number, number]>(() => {
    if (movies.length === 0) return [2006, 2026];
    const anos = movies.map((m) => m.ano_lancamento);
    return [Math.min(...anos), Math.max(...anos)];
  }, [movies]);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [yearStart, setYearStart] = useState(2006);
  const [yearEnd, setYearEnd] = useState(2026);
  const [budgetOp, setBudgetOp] = useState<BudgetOp>("any");
  const [budgetValue, setBudgetValue] = useState(100); // em $M

  // Popula defaults (selecionar todos + bounds reais) quando os dados chegam
  const seeded = useRef(false);
  useEffect(() => {
    if (movies.length === 0 || seeded.current) return;
    seeded.current = true;
    setSelectedGenres(allGenres);
    setYearStart(yearBounds[0]);
    setYearEnd(yearBounds[1]);
  }, [movies, allGenres, yearBounds]);

  const filters: Filters = useMemo(
    () => ({ selectedGenres, yearStart, yearEnd, budgetOp, budgetValue }),
    [selectedGenres, yearStart, yearEnd, budgetOp, budgetValue]
  );

  const filtered = useMemo(() => applyFilters(movies, filters), [movies, filters]);

  const kpis: Kpis = useMemo(() => {
    if (filtered.length === 0) {
      return { roiMedioPct: 0, roiMedianaPct: 0, taxaAssertividadePct: 0, receitaMediaMilhoes: 0, totalFilmes: 0 };
    }
    const rois = filtered.map((m) => m.roi_real);
    const revenues = filtered.map((m) => m.revenue_real);
    const assertividade = filtered.filter((m) => m.superou_orcamento).length / filtered.length;
    return {
      roiMedioPct: mean(rois) * 100,
      roiMedianaPct: median(rois) * 100,
      taxaAssertividadePct: assertividade * 100,
      receitaMediaMilhoes: mean(revenues) / 1e6,
      totalFilmes: filtered.length,
    };
  }, [filtered]);

  // Handlers
  const toggleGenre = (genre: string) =>
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  const selectAllGenres = () => setSelectedGenres(allGenres);
  const clearGenres = () => setSelectedGenres([]);

  const reset = () => {
    setSelectedGenres(allGenres);
    setYearStart(yearBounds[0]);
    setYearEnd(yearBounds[1]);
    setBudgetOp("any");
    setBudgetValue(100);
  };

  return {
    allGenres,
    selectedGenres,
    yearBounds,
    yearStart,
    yearEnd,
    budgetOp,
    budgetValue,
    filtered,
    kpis,
    META,
    setYearStart,
    setYearEnd,
    setBudgetOp,
    setBudgetValue,
    toggleGenre,
    selectAllGenres,
    clearGenres,
    reset,
  };
}
