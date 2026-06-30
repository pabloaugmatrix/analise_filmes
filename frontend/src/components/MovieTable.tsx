"use client";

import { useEffect, useRef } from "react";

import type { Movie } from "@/features/dashboard/types";
import { formatCompactUSD } from "@/features/dashboard/stats";
import type { SortDir, SortKey } from "@/features/dashboard/useTable";

interface Column {
  key: SortKey;
  label: string;
  align: "left" | "right";
  render: (m: Movie) => string;
}

const COLUMNS: Column[] = [
  { key: "title", label: "Filme", align: "left", render: (m) => m.title },
  { key: "genre_primary", label: "Genero", align: "left", render: (m) => m.genre_primary },
  { key: "ano_lancamento", label: "Ano", align: "right", render: (m) => String(m.ano_lancamento) },
  { key: "runtime", label: "Duracao", align: "right", render: (m) => `${m.runtime} min` },
  { key: "vote_average", label: "Nota", align: "right", render: (m) => m.vote_average.toFixed(2) },
  { key: "budget_real", label: "Orcamento", align: "right", render: (m) => formatCompactUSD(m.budget_real) },
  { key: "revenue_real", label: "Receita", align: "right", render: (m) => formatCompactUSD(m.revenue_real) },
  { key: "lucro_real", label: "Lucro", align: "right", render: (m) => formatCompactUSD(m.lucro_real) },
  { key: "roi_real", label: "ROI", align: "right", render: (m) => `${(m.roi_real * 100).toFixed(1)}%` },
  { key: "superou_orcamento", label: "Lucrativo", align: "right", render: (m) => (m.superou_orcamento ? "Sim" : "Nao") },
];

interface Props {
  rows: Movie[];
  total: number;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

export function MovieTable({
  rows,
  total,
  sortKey,
  sortDir,
  onSort,
  onLoadMore,
  hasMore,
}: Props) {
  const sentinelRef = useRef<HTMLTableRowElement>(null);

  // Scroll infinito: carrega mais quando o sentinel entra na viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onLoadMore]);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-cardalt text-[0.7rem] uppercase tracking-wide text-[#94a3b8]">
              {COLUMNS.map((col) => {
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
                    onClick={() => onSort(col.key)}
                    className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 font-semibold transition hover:text-accent ${
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
            {rows.map((m) => (
              <tr key={m.tmdb_id} className="transition hover:bg-accent/5">
                {COLUMNS.map((col) => {
                  const val = col.render(m);
                  const isProfitCol = col.key === "lucro_real";
                  const isRoiCol = col.key === "roi_real";
                  const profit = m.lucro_real;
                  return (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-2.5 ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${
                        isProfitCol
                          ? profit < 0
                            ? "font-semibold text-bad"
                            : "font-semibold text-ok"
                          : isRoiCol
                          ? profit < 0
                            ? "text-bad"
                            : "text-ok"
                          : "text-slate-200"
                      }`}
                    >
                      {col.key === "title" ? (
                        <span className="font-medium text-slate-100">{val}</span>
                      ) : (
                        val
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr ref={sentinelRef} className="h-1" />
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-[#94a3b8]">
        <span>
          Mostrando{" "}
          <b className="text-slate-200">
            {Math.min(rows.length, total)}
          </b>{" "}
          de <b className="text-slate-200">{total}</b> filmes
        </span>
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-md border border-line bg-cardalt px-3 py-1.5 font-medium text-slate-300 transition hover:border-accent hover:text-white"
          >
            Carregar mais 20
          </button>
        ) : (
          <span>Fim da lista</span>
        )}
      </div>
    </div>
  );
}
