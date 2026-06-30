"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import {
  buildGenreColorMap,
  darkAxis,
  darkTooltip,
} from "@/features/dashboard/chartTheme";
import { formatCompactUSD, linearRegression, regressionEndpoints } from "@/features/dashboard/stats";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
  allGenres: string[];
}

// Scatter Budget Real x Receita Real (cor por genero, tamanho por lucro, linha de tendencia OLS)
export function BudgetRevenueScatter({ data, allGenres }: Props) {
  const colorMap = buildGenreColorMap(allGenres);

  const byGenre = new Map<string, Movie[]>();
  for (const m of data) {
    const list = byGenre.get(m.genre_primary) ?? [];
    list.push(m);
    byGenre.set(m.genre_primary, list);
  }

  const series: EChartsOption["series"] = Array.from(byGenre.entries()).map(
    ([genre, list]) => ({
      name: genre,
      type: "scatter",
      symbolSize: (val: number[]) => Math.max(6, Math.min(46, Math.sqrt(Math.max(val[2], 0)) / 220)),
      data: list.map((m) => ({
        name: m.title,
        value: [m.budget_real, m.revenue_real, m.lucro_real, m.roi_real],
      })),
      itemStyle: { color: colorMap[genre], opacity: 0.75 },
      emphasis: { focus: "series", itemStyle: { opacity: 1, shadowBlur: 10 } },
    })
  );

  // Linha de tendencia (regressao linear OLS) sobre todos os pontos
  const reg = linearRegression(data.map((m) => ({ x: m.budget_real, y: m.revenue_real })));
  if (reg) {
    const xs = data.map((m) => m.budget_real);
    const [yMin, yMax] = regressionEndpoints(xs, reg);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    series.push({
      name: "Tendencia (OLS)",
      type: "line",
      data: [
        [xMin, yMin],
        [xMax, yMax],
      ],
      showSymbol: false,
      lineStyle: { color: "#e2e8f0", type: "dashed", width: 2 },
      tooltip: { show: false },
      z: 0,
    });
  }

  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 64, right: 24, top: 24, bottom: 56 },
    legend: {
      type: "scroll",
      top: 0,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      ...darkTooltip,
      trigger: "item",
      formatter: (p: unknown) => {
        const param = p as { data: { name?: string; value: number[] } };
        const [budget, revenue, lucro, roi] = param.data.value;
        return `<b>${param.data.name}</b><br/>
          Orcamento: ${formatCompactUSD(budget)}<br/>
          Receita: ${formatCompactUSD(revenue)}<br/>
          Lucro: ${formatCompactUSD(lucro)}<br/>
          ROI: ${(roi * 100).toFixed(1)}%`;
      },
    },
    xAxis: {
      type: "value",
      name: "Orcamento Real",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
      axisLabel: {
        ...darkAxis.axisLabel,
        formatter: (v: number) => formatCompactUSD(v),
      },
    },
    yAxis: {
      type: "value",
      name: "Receita Real",
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
      axisLabel: {
        ...darkAxis.axisLabel,
        formatter: (v: number) => formatCompactUSD(v),
      },
    },
    series,
  };

  return <EChart option={option} height={400} />;
}
