export interface Movie {
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  release_date: string;
  runtime: number;
  budget_nominal: number;
  revenue_nominal: number;
  genre_primary: string;
  genre_secondary: string;
  vote_average: number;
  vote_count: number;
  ano_lancamento: number;
  cpi_medio: number;
  fator_deflator: number;
  budget_real: number;
  revenue_real: number;
  lucro_real: number;
  roi_real: number;
  superou_orcamento: boolean;
}

export interface Kpis {
  roiMedioPct: number;
  taxaAssertividadePct: number;
  receitaMediaMilhoes: number;
  totalFilmes: number;
}

export interface GenreStat {
  genre: string;
  roiMedioPct: number;
  lucroMedioMilhoes: number;
  receitaMediaMilhoes: number;
  count: number;
}

export type TabId = "investor" | "analyst";

export const META = {
  roiPct: 20,
  assertividadePct: 60,
  receitaMediaMilhoes: 50,
} as const;
