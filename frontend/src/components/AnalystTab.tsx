"use client";

import type { Movie } from "@/features/dashboard/types";
import { VoteRevenueScatter } from "./charts/VoteRevenueScatter";
import { RuntimeRoiScatter } from "./charts/RuntimeRoiScatter";
import { TopMoviesTable } from "./TopMoviesTable";
import { ChartPanel } from "./ChartPanel";

interface Props {
  filtered: Movie[];
  allGenres: string[];
  topMovies: Movie[];
}

export function AnalystTab({ filtered, allGenres, topMovies }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Nota do Publico x Receita"
          subtitle="A nota media (IMDb) influencia a receita do filme?"
        >
          <VoteRevenueScatter data={filtered} allGenres={allGenres} />
        </ChartPanel>

        <ChartPanel
          title="Duracao x ROI (cor = nota)"
          subtitle="Impacto da duracao no sucesso financeiro e nas avaliacoes"
        >
          <RuntimeRoiScatter data={filtered} />
        </ChartPanel>
      </div>

      <ChartPanel
        title="Top 20 - Melhores Combinacoes de Desempenho"
        subtitle="Ranking por lucro real apos aplicar os filtros"
        flush
      >
        <TopMoviesTable movies={topMovies} />
      </ChartPanel>
    </div>
  );
}
