"use client";

import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { buildGenreColorMap, darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import { groupBy, mean, RUNTIME_BUCKETS, runtimeBucket } from "@/features/dashboard/aggregations";
import { formatCompactUSD } from "@/features/dashboard/stats";
import type { MetricId } from "@/features/dashboard/metrics";
import { METRICS, isLogMetric } from "@/features/dashboard/metrics";
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

// Eixo X: duracao (faixas de runtime). Uma linha por genero para a metrica
// selecionada (ROI/Lucro/Receita/Nota). Responde P7, P8 e P9.
export function DurationGenreLines({ data }: Props) {
  const [metric, setMetric] = useState<MetricId>("roi");
  const def = METRICS.find((m) => m.id === metric);

  const genresInData = useMemo(
    () => Array.from(new Set(data.map((m) => m.genre_primary))).sort(),
    [data]
  );
  const colorMap = buildGenreColorMap(genresInData);

  const series: EChartsOption["series"] = genresInData.map((genre) => {
    const byBucket = groupBy(
      data.filter((m) => m.genre_primary === genre),
      (m) => runtimeBucket(m.runtime)
    );
    return {
      name: genre,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      connectNulls: true,
      data: RUNTIME_BUCKETS.map((b) => {
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
  const axisLabel = {
    ...darkAxis.axisLabel,
    formatter: (v: number) =>
      metric === "roi" ? `${v}%` : metric === "nota" ? `${v}` : formatCompactUSD(v),
  };
  const yAxis = useLog
    ? {
        type: "log" as const,
        name: (def?.label ?? "") + " (log)",
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        axisLine: darkAxis.axisLine,
        splitLine: darkAxis.splitLine,
        axisLabel,
      }
    : {
        type: "value" as const,
        name: def?.label ?? "",
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        axisLine: darkAxis.axisLine,
        splitLine: darkAxis.splitLine,
        axisLabel,
      };

  const option: EChartsOption = {
    backgroundColor: "transparent",
    color: genresInData.map((g) => colorMap[g]),
    grid: { left: 64, right: 96, top: 52, bottom: 58 },
    legend: {
      type: "scroll",
      top: 8,
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
        const faixa = RUNTIME_BUCKETS[arr[0].dataIndex];
        const rows = arr
          .filter((p) => p.value != null)
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;vertical-align:middle"></span><span style="color:#cbd5e1">${p.seriesName}</span>: <b style="color:#fff">${formatValue(Number(p.value), metric)}</b>`
          )
          .join("<br/>");
        return `<div style="font-weight:600;color:#fff;margin-bottom:4px">${faixa}</div>${rows}`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: [...RUNTIME_BUCKETS],
      name: "Duracao (min)",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
    },
    yAxis,
    series,
  };

  return (
    <section className="card flex flex-col p-4">
      <header className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">
            {def?.label} por Duracao e Genero
          </h3>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Como cada metrica varia com a duracao do filme (uma linha por genero).
          </p>
        </div>
        <MetricTabs value={metric} onChange={setMetric} />
      </header>
      <EChart option={option} height={440} />
    </section>
  );
}
