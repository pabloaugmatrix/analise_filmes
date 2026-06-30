"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useFilters } from "./useFilters";
import type { Movie } from "./types";

export type SortDir = "desc" | "asc" | "none";
export type SortKey = keyof Movie;

const PAGE_SIZE = 20;

// Normaliza texto: minusculas, sem acentos, para busca tolerante.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compare(a: Movie, b: Movie, key: SortKey): number {
  const av = a[key] as unknown;
  const bv = b[key] as unknown;
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  if (typeof av === "boolean" && typeof bv === "boolean")
    return av === bv ? 0 : av ? 1 : -1;
  return String(av ?? "").localeCompare(String(bv ?? ""));
}

// Envolve useFilters (mesmos filtros das outras paginas) e adiciona ordenacao
// por coluna + paginacao incremental (scroll infinito).
export function useTable(movies: Movie[]) {
  const filters = useFilters(movies);

  const [sortKey, setSortKey] = useState<SortKey>("lucro_real");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");

  const normalizedSearch = normalize(search.trim());
  // Busca por nome aplicada por cima dos filtros compartilhados (genero/ano/orcamento).
  const searched = useMemo(() => {
    if (!normalizedSearch) return filters.filtered;
    return filters.filtered.filter((m) =>
      normalize(m.title).includes(normalizedSearch)
    );
  }, [filters.filtered, normalizedSearch]);

  const handleSort = useCallback(
    (key: SortKey) => {
      setSortKey((prevKey) => {
        if (prevKey !== key) {
          // Coluna nova: comeca pelo maior (desc)
          setSortDir("desc");
          return key;
        }
        // Mesma coluna: alterna desc -> asc -> none -> desc ...
        setSortDir((d) => (d === "desc" ? "asc" : d === "asc" ? "none" : "desc"));
        return key;
      });
    },
    []
  );

  const sorted = useMemo(() => {
    // "none" = sem ordenacao (ordem natural dos dados filtrados)
    if (sortDir === "none") return searched;
    const arr = [...searched];
    arr.sort((a, b) => {
      const c = compare(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return arr;
  }, [searched, sortKey, sortDir]);

  const visible = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount]
  );

  // Reset da paginacao sempre que filtros, busca ou ordenacao mudam
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searched, sortKey, sortDir]);

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, sorted.length));
  }, [sorted.length]);

  return {
    ...filters,
    sorted,
    visible,
    sortKey,
    sortDir,
    search,
    setSearch,
    handleSort,
    loadMore,
    hasMore: visibleCount < sorted.length,
  };
}
