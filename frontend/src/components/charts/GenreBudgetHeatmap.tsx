"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import {
  BUDGET_BUCKETS,
  budgetBucket,
  groupBy,
  mean,
} from "@/features/dashboard/aggregations";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
}

// Heatmap Genero x Orcamento -> ROI medio (espelha o dashboard de ref)
export function GenreBudgetHeatmap({ data }: Props) {
  const groups = groupBy(data, (m) => m.genre_primary);
  const genres = Array.from(groups.entries())
    .map(([g, list]) => ({ g, n: list.length }))
    .sort((a, b) => b.n - a.n)
    .map((r) => r.g);

  const cells: Array<[number, number, number]> = [];
  let max = 0;
  genres.forEach((g, j) => {
    BUDGET_BUCKETS.forEach((b, i) => {
      const list = (groups.get(g) ?? []).filter((m) => budgetBucket(m.budget_real) === b);
      if (!list.length) return;
      const val = Number((mean(list.map((m) => m.roi_real)) * 100).toFixed(1));
      max = Math.max(max, val);
      cells.push([i, j, val]);
    });
  });

  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 120, right: 28, top: 24, bottom: 100 },
    tooltip: {
      ...darkTooltip,
      position: "top",
      formatter: (p: unknown) => {
        const d = (p as { data: [number, number, number] }).data;
        return `${BUDGET_BUCKETS[d[0]]}<br/>${genres[d[1]]}<br/>ROI real: ${d[2]}%`;
      },
    },
    xAxis: {
      type: "category",
      data: [...BUDGET_BUCKETS],
      splitArea: { show: true },
      ...darkAxis,
      axisLabel: { ...darkAxis.axisLabel, fontSize: 10 },
    },
    yAxis: {
      type: "category",
      data: genres,
      splitArea: { show: true },
      ...darkAxis,
      axisLabel: { ...darkAxis.axisLabel, fontSize: 10 },
    },
    visualMap: {
      min: 0,
      max: max || 50,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 16,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      inRange: { color: ["#2e3340", "#6366f1", "#10b981"] },
    },
    series: [
      {
        type: "heatmap",
        data: cells,
        label: { show: true, color: "#fff", fontSize: 10, formatter: (p: unknown) => `${(p as { data: [number, number, number] }).data[2]}%` },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
      },
    ],
  };

  return <EChart option={option} height={400} />;
}
