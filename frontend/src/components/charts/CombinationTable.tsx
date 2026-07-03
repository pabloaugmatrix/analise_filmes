"use client";

import { useMemo, useState } from "react";

import type { Movie } from "@/features/dashboard/types";
import {
  BUDGET_BUCKETS,
  RUNTIME_BUCKETS,
  budgetBucket,
  runtimeBucket,
  groupBy,
  mean,
} from "@/features/dashboard/aggregations";
import { formatCompactUSD } from "@/features/dashboard/stats";

interface Props {
  data: Movie[];
}

const MIN_SAMPLE = 5;

type FocusId = "lucro" | "roi" | "equilibrado";

interface FocusDef {
  id: FocusId;
  short: string;
  desc: string;
  w: { roi: number; lucro: number; receita: number; nota: number; assert: number };
}

const FOCUSES: FocusDef[] = [
  {
    id: "lucro",
    short: "Lucro",
    desc: "Pesos: Lucro 50% / Receita 20% / ROI 20% / Nota 10%",
    w: { roi: 0.2, lucro: 0.5, receita: 0.2, nota: 0.1, assert: 0 },
  },
  {
    id: "roi",
    short: "ROI",
    desc: "Pesos: ROI 50% / Lucro 20% / Lucrativos 20% / Nota 10%",
    w: { roi: 0.5, lucro: 0.2, receita: 0, nota: 0.1, assert: 0.2 },
  },
  {
    id: "equilibrado",
    short: "Equil.",
    desc: "Pesos: ROI 25% / Lucro 25% / Receita 25% / Nota 25%",
    w: { roi: 0.25, lucro: 0.25, receita: 0.25, nota: 0.25, assert: 0 },
  },
];

type SortKey =
  | "idc"
  | "genre"
  | "budget"
  | "runtime"
  | "n"
  | "roi"
  | "lucro"
  | "receita"
  | "nota"
  | "assert";
type SortDir = "desc" | "asc" | "none";

interface CellInfo {
  genre: string;
  budget: string;
  runtime: string;
  n: number;
  roi: number;
  lucro: number;
  receita: number;
  nota: number;
  assert: number;
  idc: number;
}

const BUDGET_ORDER = BUDGET_BUCKETS as readonly string[];
const RUNTIME_ORDER = RUNTIME_BUCKETS as readonly string[];

const COLS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "idc", label: "IDC", align: "right" },
  { key: "genre", label: "Genero", align: "left" },
  { key: "budget", label: "Orcamento", align: "left" },
  { key: "runtime", label: "Duracao", align: "left" },
  { key: "n", label: "Filmes", align: "right" },
  { key: "roi", label: "ROI", align: "right" },
  { key: "lucro", label: "Lucro", align: "right" },
  { key: "receita", label: "Receita", align: "right" },
  { key: "nota", label: "Nota", align: "right" },
  { key: "assert", label: "Lucrativos", align: "right" },
];

const PERF_KEYS: SortKey[] = ["idc", "roi", "lucro", "receita", "nota", "assert"];

function idcColor(v: number): string {
  if (v >= 67) return "#34d399";
  if (v >= 34) return "#fbbf24";
  return "#f87171";
}

function compareCells(a: CellInfo, b: CellInfo, key: SortKey): number {
  switch (key) {
    case "genre":
      return a.genre.localeCompare(b.genre);
    case "budget":
      return BUDGET_ORDER.indexOf(a.budget) - BUDGET_ORDER.indexOf(b.budget);
    case "runtime":
      return RUNTIME_ORDER.indexOf(a.runtime) - RUNTIME_ORDER.indexOf(b.runtime);
    default:
      return (a[key] as number) - (b[key] as number);
  }
}

function renderMetricCell(
  c: CellInfo,
  key: SortKey
): { text: string; tone?: "good" | "bad" } {
  switch (key) {
    case "genre":
    case "budget":
    case "runtime":
      return { text: c[key] };
    case "n":
      return { text: String(c.n) };
    case "roi":
      return { text: `${c.roi.toFixed(0)}%`, tone: c.roi >= 0 ? "good" : "bad" };
    case "lucro":
      return { text: formatCompactUSD(c.lucro), tone: c.lucro >= 0 ? "good" : "bad" };
    case "receita":
      return { text: formatCompactUSD(c.receita) };
    case "nota":
      return { text: c.nota.toFixed(1) };
    case "assert":
      return { text: `${c.assert.toFixed(0)}%` };
    default:
      return { text: "" };
  }
}

// Ranking de combinacoes Genero x Orcamento x Duracao com Indice de Desempenho
// Composto (IDC). O IDC normaliza cada metrica (min-max) entre todas as
// combinacoes validas e aplica pesos conforme o foco escolhido (Lucro / ROI /
// Equilibrado), gerando uma nota unica de 0 a 100. Responde P10.
export function CombinationTable({ data }: Props) {
  const [focus, setFocus] = useState<FocusId>("lucro");
  const [sortKey, setSortKey] = useState<SortKey>("idc");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const focusDef = FOCUSES.find((f) => f.id === focus)!;

  const rawCells = useMemo(() => {
    const out: Omit<CellInfo, "idc">[] = [];
    for (const [genre, gFilms] of groupBy(data, (m) => m.genre_primary)) {
      for (const [budget, bFilms] of groupBy(gFilms, (m) => budgetBucket(m.budget_real))) {
        for (const [runtime, rFilms] of groupBy(bFilms, (m) => runtimeBucket(m.runtime))) {
          if (rFilms.length < MIN_SAMPLE) continue;
          out.push({
            genre,
            budget,
            runtime,
            n: rFilms.length,
            roi: mean(rFilms.map((m) => m.roi_real)) * 100,
            lucro: mean(rFilms.map((m) => m.lucro_real)),
            receita: mean(rFilms.map((m) => m.revenue_real)),
            nota: mean(rFilms.map((m) => m.vote_average)),
            assert:
              (rFilms.filter((m) => m.superou_orcamento).length / rFilms.length) * 100,
          });
        }
      }
    }
    return out;
  }, [data]);

  const cells = useMemo<CellInfo[]>(() => {
    if (rawCells.length === 0) return [];

    const minMax = (arr: number[]) => {
      let min = Infinity;
      let max = -Infinity;
      for (const v of arr) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
      return { min, max };
    };

    const rRoi = minMax(rawCells.map((c) => c.roi));
    const rLucro = minMax(rawCells.map((c) => c.lucro));
    const rReceita = minMax(rawCells.map((c) => c.receita));
    const rNota = minMax(rawCells.map((c) => c.nota));
    const rAssert = minMax(rawCells.map((c) => c.assert));

    const norm = (v: number, r: { min: number; max: number }) =>
      r.max === r.min ? 0.5 : (v - r.min) / (r.max - r.min);

    const w = focusDef.w;

    return rawCells.map((c) => {
      const idc =
        (norm(c.roi, rRoi) * w.roi +
          norm(c.lucro, rLucro) * w.lucro +
          norm(c.receita, rReceita) * w.receita +
          norm(c.nota, rNota) * w.nota +
          norm(c.assert, rAssert) * w.assert) *
        100;
      return { ...c, idc };
    });
  }, [rawCells, focusDef]);

  const sorted = useMemo(() => {
    if (sortDir === "none") return cells;
    const arr = [...cells];
    arr.sort((a, b) => {
      const c = compareCells(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return arr;
  }, [cells, sortKey, sortDir]);

  const handleHeader = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir("desc");
        return key;
      }
      setSortDir((d) => (d === "desc" ? "asc" : d === "asc" ? "none" : "desc"));
      return key;
    });
  };

  const handleFocus = (f: FocusId) => {
    setFocus(f);
    setSortKey("idc");
    setSortDir("desc");
  };

  const topIsBest = sortDir === "desc" && PERF_KEYS.includes(sortKey);

  return (
    <section className="card flex flex-col p-4">
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            Ranking de Combinacoes: Genero x Orcamento x Duracao
          </h3>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Indice de Desempenho Composto (IDC 0-100). {focusDef.desc}. Combinacoes
            com menos de {MIN_SAMPLE} filmes sao omitidas.
          </p>
        </div>
        <div className="flex gap-1.5">
          {FOCUSES.map((f) => {
            const active = f.id === focus;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFocus(f.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-accent bg-accent/20 text-white"
                    : "border-line bg-cardalt text-[#94a3b8] hover:border-accent hover:text-white"
                }`}
              >
                {f.short}
              </button>
            );
          })}
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-[#94a3b8]">
          Nenhuma combinacao com {MIN_SAMPLE}+ filmes neste recorte.
        </div>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-line bg-cardalt text-[0.7rem] uppercase tracking-wide text-[#94a3b8]">
                <th className="px-3 py-2.5 text-left font-semibold">#</th>
                {COLS.map((col) => {
                  const active = sortKey === col.key && sortDir !== "none";
                  const icon =
                    sortKey === col.key && sortDir !== "none"
                      ? sortDir === "asc"
                        ? "▲"
                        : "▼"
                      : "↕";
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleHeader(col.key)}
                      className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 font-semibold transition hover:text-accent ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${active ? "text-accent" : ""}`}
                    >
                      {col.label} <span className="text-[0.6rem]">{icon}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {sorted.map((c, i) => {
                const isBest = topIsBest && i === 0;
                return (
                  <tr
                    key={`${c.genre}-${c.budget}-${c.runtime}`}
                    className={`transition hover:bg-accent/5 ${isBest ? "bg-accent/10" : ""}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {isBest ? (
                        <span className="font-bold text-accent">★</span>
                      ) : (
                        i + 1
                      )}
                    </td>
                    {COLS.map((col) => {
                      if (col.key === "idc") {
                        const color = idcColor(c.idc);
                        return (
                          <td
                            key="idc"
                            className="whitespace-nowrap px-3 py-2 text-right"
                          >
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className="font-bold tabular-nums"
                                style={{ color }}
                              >
                                {c.idc.toFixed(1)}
                              </span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line/40">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(c.idc, 2)}%`,
                                    backgroundColor: color,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        );
                      }
                      const { text, tone } = renderMetricCell(c, col.key);
                      const toneCls =
                        tone === "good"
                          ? "text-ok"
                          : tone === "bad"
                          ? "text-bad"
                          : col.key === "genre"
                          ? "font-medium text-slate-100"
                          : "text-slate-200";
                      return (
                        <td
                          key={col.key}
                          className={`whitespace-nowrap px-3 py-2 tabular-nums ${
                            col.align === "right" ? "text-right" : "text-left"
                          } ${toneCls}`}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between px-1 text-xs text-[#64748b]">
        <span>{sorted.length} combinacoes validas</span>
        {topIsBest && sorted.length > 0 && (
          <span>
            Melhor:{" "}
            <b className="text-slate-200">
              {sorted[0].genre} &middot; {sorted[0].budget} &middot;{" "}
              {sorted[0].runtime}
            </b>{" "}
            (IDC {sorted[0].idc.toFixed(1)})
          </span>
        )}
      </div>
    </section>
  );
}
