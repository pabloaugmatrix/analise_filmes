"use client";

import type { Movie } from "@/features/dashboard/types";
import { formatCompactUSD } from "@/features/dashboard/stats";

interface Props {
  movies: Movie[];
}

export function TopMoviesTable({ movies }: Props) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-700 bg-ink-850 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Filme</th>
              <th className="px-4 py-3 font-medium">Genero</th>
              <th className="px-4 py-3 text-right font-medium">Orcamento</th>
              <th className="px-4 py-3 text-right font-medium">Duracao</th>
              <th className="px-4 py-3 text-right font-medium">Nota</th>
              <th className="px-4 py-3 text-right font-medium">ROI</th>
              <th className="px-4 py-3 text-right font-medium">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {movies.map((m, i) => (
              <tr key={m.tmdb_id} className="transition hover:bg-ink-850">
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-100">{m.title}</td>
                <td className="px-4 py-3 text-slate-400">{m.genre_primary}</td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatCompactUSD(m.budget_real)}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{m.runtime} min</td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {m.vote_average.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-emerald-300">
                  {(m.roi_real * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-100">
                  {formatCompactUSD(m.lucro_real)}
                </td>
              </tr>
            ))}
            {movies.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Nenhum filme corresponde aos filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
