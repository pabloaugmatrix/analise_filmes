"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchMovies } from "./services";
import type { GenreStat, Kpis, Movie, TabId } from "./types";

const DEFAULT_YEAR_RANGE: [number, number] = [2006, 2026];

export function useDashboard() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>(DEFAULT_YEAR_RANGE);
  const [tab, setTab] = useState<TabId>("investor");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchMovies(controller.signal)
      .then((data) => {
        setMovies(data);
        const genres = Array.from(new Set(data.map((m) => m.genre_primary))).sort();
        setSelectedGenres(genres);
        const anos = data.map((m) => m.ano_lancamento);
        if (anos.length) {
          setYearRange([Math.min(...anos), Math.max(...anos)]);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const allGenres = useMemo(
    () => Array.from(new Set(movies.map((m) => m.genre_primary))).sort(),
    [movies]
  );

  const yearBounds = useMemo<[number, number]>(() => {
    if (movies.length === 0) return [2006, 2026];
    const anos = movies.map((m) => m.ano_lancamento);
    return [Math.min(...anos), Math.max(...anos)];
  }, [movies]);

  const filtered = useMemo(() => {
    const [minAno, maxAno] = yearRange;
    return movies.filter(
      (m) =>
        selectedGenres.includes(m.genre_primary) &&
        m.ano_lancamento >= minAno &&
        m.ano_lancamento <= maxAno
    );
  }, [movies, selectedGenres, yearRange]);

  const kpis: Kpis = useMemo(() => {
    if (filtered.length === 0) {
      return { roiMedioPct: 0, taxaAssertividadePct: 0, receitaMediaMilhoes: 0, totalFilmes: 0 };
    }
    const roiMedio = filtered.reduce((s, m) => s + m.roi_real, 0) / filtered.length;
    const assertividade =
      filtered.filter((m) => m.superou_orcamento).length / filtered.length;
    const receitaMedia =
      filtered.reduce((s, m) => s + m.revenue_real, 0) / filtered.length / 1e6;
    return {
      roiMedioPct: roiMedio * 100,
      taxaAssertividadePct: assertividade * 100,
      receitaMediaMilhoes: receitaMedia,
      totalFilmes: filtered.length,
    };
  }, [filtered]);

  const genreStats: GenreStat[] = useMemo(() => {
    const groups = new Map<string, Movie[]>();
    for (const m of filtered) {
      const list = groups.get(m.genre_primary) ?? [];
      list.push(m);
      groups.set(m.genre_primary, list);
    }
    return Array.from(groups.entries())
      .map(([genre, list]) => ({
        genre,
        count: list.length,
        roiMedioPct: (list.reduce((s, m) => s + m.roi_real, 0) / list.length) * 100,
        lucroMedioMilhoes:
          (list.reduce((s, m) => s + m.lucro_real, 0) / list.length) / 1e6,
        receitaMediaMilhoes:
          (list.reduce((s, m) => s + m.revenue_real, 0) / list.length) / 1e6,
      }))
      .sort((a, b) => b.roiMedioPct - a.roiMedioPct);
  }, [filtered]);

  const topMovies = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => b.lucro_real - a.lucro_real)
        .slice(0, 20),
    [filtered]
  );

  const handleToggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const handleSelectAllGenres = useCallback(() => {
    setSelectedGenres(allGenres);
  }, [allGenres]);

  const handleClearGenres = useCallback(() => {
    setSelectedGenres([]);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedGenres(allGenres);
    setYearRange(DEFAULT_YEAR_RANGE);
  }, [allGenres]);

  return {
    loading,
    error,
    movies,
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
  };
}
