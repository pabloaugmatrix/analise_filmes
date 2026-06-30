import type { Movie } from "./types";

export async function fetchMovies(signal?: AbortSignal): Promise<Movie[]> {
  const res = await fetch("/api/movies", { cache: "no-store", signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}
