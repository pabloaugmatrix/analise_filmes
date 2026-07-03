"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { buildGenreColorMap, darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import {
  groupBy,
  mean,
  RUNTIME_BUCKETS,
  runtimeBucket,
  NOTA_BUCKETS,
  ROI_BUCKETS,
  RECEITA_BUCKETS,
  LUCRO_BUCKETS,
  notaBucket,
  roiBucket,
  receitaBucket,
  lucroBucket,
} from "@/features/dashboard/aggregations";
import { formatCompactUSD } from "@/features/dashboard/stats";
import type { MetricId, XDim } from "@/features/dashboard/metrics";
import { METRICS, X_DIMS, isLogMetric } from "@/features/dashboard/metrics";
import { MetricTabs } from "@/components/MetricTabs";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
}

function metricValue(m: Movie, metric: MetricId): number {
  switch (metric) {
    case "roi":
      return m.roi_real * 100;
    case "lucro":
      return m.lucro_real;
    case "receita":
      return m.revenue_real;
    case "nota":
      return m.vote_average;
  }
}

function formatValue(v: number, metric: MetricId): string {
  if (metric === "roi") return `${v.toFixed(1)}%`;
  if (metric === "nota") return v.toFixed(2);
  return formatCompactUSD(v);
}

// Faixas (buckets) do eixo X conforme a dimensao escolhida.
function xBuckets(x: XDim): readonly string[] {
  switch (x) {
    case "duracao":
      return RUNTIME_BUCKETS;
    case "nota":
      return NOTA_BUCKETS;
    case "roi":
      return ROI_BUCKETS;
    case "receita":
      return RECEITA_BUCKETS;
    case "lucro":
      return LUCRO_BUCKETS;
  }
}

function xBucketOf(m: Movie, x: XDim): string {
  switch (x) {
    case "duracao":
      return runtimeBucket(m.runtime);
    case "nota":
      return notaBucket(m.vote_average);
    case "roi":
      return roiBucket(m.roi_real);
    case "receita":
      return receitaBucket(m.revenue_real);
    case "lucro":
      return lucroBucket(m.lucro_real);
  }
}

// Linhas por genero: eixo Y = metrica (seletor de cima), eixo X = dimensao
// (seletor de baixo). Permite cruzar metricas (ex.: receita x nota -> P5),
// alem de manter a analise por duracao (P7-P9).
export function DurationGenreLines({ data }: Props) {
  const [metric, setMetric] = useState<MetricId>("roi");
  const [xDim, setXDim] = useState<XDim>("duracao");
  const yDef = METRICS.find((m) => m.id === metric);
  const xDef = X_DIMS.find((x) => x.id === xDim);

  const buckets = xBuckets(xDim);

  const genresInData = useMemo(
    () => Array.from(new Set(data.map((m) => m.genre_primary))).sort(),
    [data]
  );
  const colorMap = buildGenreColorMap(genresInData);

  const countsByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const genre of genresInData) {
      const byBucket = groupBy(
        data.filter((m) => m.genre_primary === genre),
        (m) => xBucketOf(m, xDim)
      );
      for (const b of buckets) {
        const list = byBucket.get(b);
        map.set(`${genre}||${b}`, list ? list.length : 0);
      }
    }
    return map;
  }, [data, genresInData, buckets, xDim]);

  const series: EChartsOption["series"] = genresInData.map((genre) => {
    const byBucket = groupBy(
      data.filter((m) => m.genre_primary === genre),
      (m) => xBucketOf(m, xDim)
    );
    return {
      name: genre,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      connectNulls: true,
      data: buckets.map((b) => {
        const list = byBucket.get(b);
        return list && list.length
          ? Number(mean(list.map((m) => metricValue(m, metric))).toFixed(metric === "nota" ? 2 : 1))
          : null;
      }),
      lineStyle: { width: 2.5, color: colorMap[genre] },
      itemStyle: { color: colorMap[genre] },
      endLabel: { show: false },
      emphasis: {
        focus: "series",
        lineStyle: { width: 5, shadowBlur: 8, shadowColor: colorMap[genre] },
        itemStyle: { borderColor: "#fff", borderWidth: 1.5 },
        endLabel: {
          show: true,
          formatter: "{a}",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: colorMap[genre],
          padding: [3, 7],
          borderRadius: 4,
          distance: 6,
        },
      },
      blur: { lineStyle: { opacity: 0.1 }, itemStyle: { opacity: 0.1 } },
    };
  });

  const useLog = isLogMetric(metric);
  const yAxisLabel = {
    ...darkAxis.axisLabel,
    formatter: (v: number) =>
      metric === "roi" ? `${v}%` : metric === "nota" ? `${v}` : formatCompactUSD(v),
  };
  const yAxis = useLog
    ? {
        type: "log" as const,
        name: (yDef?.label ?? "") + " (log)",
        nameLocation: "end" as const,
        nameGap: 12,
        nameTextStyle: { color: "#cbd5e1", fontSize: 11 },
        axisLine: darkAxis.axisLine,
        splitLine: darkAxis.splitLine,
        axisLabel: yAxisLabel,
      }
    : {
        type: "value" as const,
        name: yDef?.label ?? "",
        nameLocation: "end" as const,
        nameGap: 12,
        nameTextStyle: { color: "#cbd5e1", fontSize: 11 },
        axisLine: darkAxis.axisLine,
        splitLine: darkAxis.splitLine,
        axisLabel: yAxisLabel,
      };

  const option: EChartsOption = {
    backgroundColor: "transparent",
    color: genresInData.map((g) => colorMap[g]),
    grid: { left: 104, right: 96, top: 70, bottom: 58 },
    legend: {
      type: "scroll",
      top: 8,
      itemGap: 16,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    tooltip: {
      ...darkTooltip,
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: "#475569" } },
      formatter: (params: unknown) => {
        const arr = params as Array<{
          seriesName: string;
          value: number | null;
          color: string;
          dataIndex: number;
        }>;
        if (!arr || arr.length === 0) return "";
        const faixa = buckets[arr[0].dataIndex];
        const visible = arr.filter((p) => p.value != null);
        if (visible.length === 0) {
          return `<div style="font-weight:600;color:#fff;margin-bottom:4px">${faixa}</div><div style="color:#64748b;font-size:11px">Sem dados nesta faixa</div>`;
        }
        const metricLabel = yDef?.short ?? "Valor";
        const rows = visible
          .map((p) => {
            const count = countsByKey.get(`${p.seriesName}||${faixa}`) ?? 0;
            return `<tr>
<td style="padding:2px 14px 2px 0;white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;vertical-align:middle"></span><span style="color:#cbd5e1">${p.seriesName}</span></td>
<td style="text-align:right;padding:2px 14px;white-space:nowrap;color:#fff;font-weight:600">${formatValue(Number(p.value), metric)}</td>
<td style="text-align:right;padding:2px 0;white-space:nowrap;color:#94a3b8">${count}</td>
</tr>`;
          })
          .join("");
        return `<div style="font-weight:600;color:#fff;margin-bottom:6px">${faixa}</div><table style="border-collapse:collapse;font-size:12px"><thead><tr style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:0.05em"><th style="text-align:left;padding:0 14px 4px 0"></th><th style="text-align:right;padding:0 14px 4px">${metricLabel}</th><th style="text-align:right;padding:0 0 4px">Filmes</th></tr></thead><tbody>${rows}</tbody></table>`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: [...buckets],
      name: xDef?.label,
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
    },
    yAxis,
    series,
  };

  // Evita X == Y: desabilita a metrica do outro eixo em cada seletor.
  const yDisabled = xDim !== "duracao" ? [xDim as MetricId] : undefined;

  return (
    <section className="card flex flex-col p-4">
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {yDef?.label} por {xDef?.label} e Genero
          </h3>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Eixo Y (acima) e eixo X (abaixo) selecionaveis. Como o {yDef?.short}{" "}
            de cada genero se comporta segundo {xDef?.short.toLowerCase()}.
            {isLogMetric(metric) ? " Eixo Y em escala logaritmica." : ""}
          </p>
        </div>
        <MetricTabs value={metric} onChange={setMetric} disabled={yDisabled} />
      </header>
      <EChart option={option} height={440} />
      <footer className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Eixo X
        </span>
        {X_DIMS.map((x) => {
          const active = x.id === xDim;
          const isDisabled = x.id !== "duracao" && x.id === metric;
          const cls = active
            ? "rounded-md border px-3 py-1.5 text-xs font-medium border-accent bg-accent/20 text-white"
            : isDisabled
            ? "rounded-md border px-3 py-1.5 text-xs font-medium border-line bg-cardalt text-[#94a3b8] cursor-not-allowed opacity-30"
            : "rounded-md border px-3 py-1.5 text-xs font-medium border-line bg-cardalt text-[#94a3b8] hover:border-accent hover:text-white";
          return (
            <button
              key={x.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setXDim(x.id)}
              className={cls}
            >
              {x.short}
            </button>
          );
        })}
      </footer>
    </section>
  );
}
