import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

import type { Movie } from "@/features/dashboard/types";

export const runtime = "nodejs";

const CSV_RELATIVE_PATH = path.join(
  "dados",
  "processados",
  "cinematografia_analytics_trusted.csv"
);

const CSV_CANDIDATES = [
  // Vercel com Root Directory em `frontend/`: o CSV precisa estar dentro do frontend.
  path.join(process.cwd(), CSV_RELATIVE_PATH),
  // Desenvolvimento local a partir da estrutura completa do repositorio.
  path.join(process.cwd(), "..", CSV_RELATIVE_PATH),
];

// Cache em modulo: o CSV nao muda durante a sessao de dev
let cache: Movie[] | null = null;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const csvPath =
    process.env.TRUSTED_CSV_PATH ??
    CSV_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
    CSV_CANDIDATES[0];

  if (!fs.existsSync(csvPath)) {
    return NextResponse.json(
      {
        error:
          "Base Trusted nao encontrada. Gere o CSV processado e mantenha uma copia em `frontend/dados/processados/` para deploy na Vercel.",
        path: csvPath,
      },
      { status: 404 }
    );
  }

  if (cache) {
    return NextResponse.json(cache);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  const movies: Movie[] = data.map((row) => ({
    tmdb_id: toNumber(row.tmdb_id),
    imdb_id: row.imdb_id || null,
    title: row.title ?? "",
    release_date: row.release_date ?? "",
    runtime: toNumber(row.runtime),
    budget_nominal: toNumber(row.budget_nominal),
    revenue_nominal: toNumber(row.revenue_nominal),
    genre_primary: row.genre_primary ?? "N/A",
    genre_secondary: row.genre_secondary ?? "N/A",
    vote_average: toNumber(row.vote_average),
    vote_count: toNumber(row.vote_count),
    ano_lancamento: toNumber(row.ano_lancamento),
    cpi_medio: toNumber(row.cpi_medio),
    fator_deflator: toNumber(row.fator_deflator),
    budget_real: toNumber(row.budget_real),
    revenue_real: toNumber(row.revenue_real),
    lucro_real: toNumber(row.lucro_real),
    roi_real: toNumber(row.roi_real),
    superou_orcamento: String(row.superou_orcamento).toLowerCase() === "true",
  }));

  cache = movies;
  return NextResponse.json(movies);
}
