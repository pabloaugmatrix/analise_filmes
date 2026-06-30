"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { fetchMovies } from "./services";
import type { Movie } from "./types";

interface MoviesState {
  movies: Movie[];
  loading: boolean;
  error: string | null;
}

const MoviesContext = createContext<MoviesState>({
  movies: [],
  loading: true,
  error: null,
});

export function MoviesProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMovies(controller.signal)
      .then((data) => {
        setMovies(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <MoviesContext.Provider value={{ movies, loading, error }}>
      {children}
    </MoviesContext.Provider>
  );
}

export function useMovies(): MoviesState {
  return useContext(MoviesContext);
}
