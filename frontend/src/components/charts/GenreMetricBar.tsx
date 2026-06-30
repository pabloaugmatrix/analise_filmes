"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import { groupBy, mean } from "@/features/dashboard/aggregations";
import { formatCompactUSD } from "@/features/dashboard/stats";
import type { MetricId } from "@/features/dashboard/metrics";
import { isLogMetric } from "@/features/dashboard/metrics";
import { EChart } from "@/components/charts/EChart";

export type GenreMetric = MetricId;

interface Props {
  data: Movie[];
  metric: GenreMetric;
}

const CONFIG: Record<
  GenreMetric,
  { label: string; unit: string; color: [string, string] }
> = {
  roi: { label: "ROI Real Medio (%)", unit: "%", color: ["#818cf8", "#4f46e5"] },
  lucro: { label: "Lucro Real Medio", unit: "", color: ["#34d399", "#059669"] },
  receita: { label: "Receita Real Media", unit: "", color: ["#fbbf24", "#d97706"] },
  nota: { label: "Nota Media (IMDb)", unit: "", color: ["#f472b6", "#db2777"] },
};

// Barra generica por genero - espelha o grafico de barras do Streamlit
export function GenreMetricBar({ data, metric }: Props) {
  const cfg = CONFIG[metric];

  const groups = groupBy(data, (m) => m.genre_primary);
  const rows = Array.from(groups.entries())
    .map(([genre, list]) => {
      let value: number;
      if (metric === "roi") value = mean(list.map((m) => m.roi_real)) * 100;
      else if (metric === "lucro") value = mean(list.map((m) => m.lucro_real));
      else if (metric === "receita") value = mean(list.map((m) => m.revenue_real));
      else value = mean(list.map((m) => m.vote_average));
      return { genre, count: list.length, value };
    })
    .sort((a, b) => b.value - a.value);

  const useLog = isLogMetric(metric);
  const axisLabel =
    metric === "receita" || metric === "lucro"
      ? { ...darkAxis.axisLabel, formatter: (v: number) => formatCompactUSD(v) }
      : metric === "roi"
      ? { ...darkAxis.axisLabel, formatter: "{value}%" }
      : { ...darkAxis.axisLabel };
  const yAxis = useLog
    ? {
        type: "log" as const,
        name: cfg.label + " (log)",
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        axisLine: darkAxis.axisLine,
        splitLine: darkAxis.splitLine,
        axisLabel,
      }
    : {
        type: "value" as const,
        name: cfg.label,
        nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
        axisLine: darkAxis.axisLine,
        splitLine: darkAxis.splitLine,
        axisLabel,
      };

  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 56, right: 28, top: 40, bottom: 92 },
    tooltip: {
      ...darkTooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        const row = rows.find((r) => r.genre === p.name);
        let val: string;
        if (metric === "roi") val = `${p.value.toFixed(1)}%`;
        else val = formatCompactUSD(p.value);
        return `<b>${p.name}</b><br/>${cfg.label}: ${val}<br/>Filmes: ${
          row ? row.count : 0
        }`;
      },
    },
    xAxis: {
      type: "category",
      data: rows.map((r) => r.genre),
      ...darkAxis,
      axisLabel: { ...darkAxis.axisLabel, rotate: 35, fontSize: 10 },
    },
    yAxis,
    series: [
      {
        type: "bar",
        barMaxWidth: 40,
        data: rows.map((r) =>
          metric === "nota" ? Number(r.value.toFixed(2)) : Number(r.value.toFixed(1))
        ),
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: cfg.color[0] },
              { offset: 1, color: cfg.color[1] },
            ],
          },
          borderRadius: [5, 5, 0, 0],
        },
        label: {
          show: true,
          position: "top",
          color: "#cbd5e1",
          fontSize: 10,
          formatter: (p: unknown) => {
            const v = (p as { value: number }).value;
            return metric === "roi" ? `${v}%` : metric === "nota" ? `${v}` : formatCompactUSD(v);
          },
        },
      },
    ],
  };

  return <EChart option={option} height={370} />;
}
