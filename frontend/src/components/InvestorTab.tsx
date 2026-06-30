"use client";

import type { GenreStat, Movie } from "@/features/dashboard/types";
import { BudgetRevenueScatter } from "./charts/BudgetRevenueScatter";
import { RoiByGenreBar } from "./charts/RoiByGenreBar";
import { ChartPanel } from "./ChartPanel";

interface Props {
  filtered: Movie[];
  allGenres: string[];
  genreStats: GenreStat[];
}

export function InvestorTab({ filtered, allGenres, genreStats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartPanel
        title="Orcamento x Receita & Lucro"
        subtitle="Como o orcamento influencia a bilheteria (tamanho = lucro real, linha = tendencia OLS)"
      >
        <BudgetRevenueScatter data={filtered} allGenres={allGenres} />
      </ChartPanel>

      <ChartPanel
        title="ROI Real Medio por Genero"
        subtitle="Relacao entre genero e retorno financeiro proporcional medio"
      >
        <RoiByGenreBar stats={genreStats} />
      </ChartPanel>
    </div>
  );
}
