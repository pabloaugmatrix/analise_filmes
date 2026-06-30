"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import {
  buildGenreColorMap,
  darkAxis,
  darkTooltip,
} from "@/features/dashboard/chartTheme";
import { formatCompactUSD } from "@/features/dashboard/stats";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
  allGenres: string[];
}

// Scatter Nota (IMDb) x Receita Real (cor por genero) - espelha o grafico do Streamlit
export function VoteRevenueScatter({ data, allGenres }: Props) {
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
      symbolSize: 10,
      data: list.map((m) => ({
        name: m.title,
        value: [m.vote_average, m.revenue_real, m.lucro_real],
      })),
      itemStyle: { color: colorMap[genre], opacity: 0.7 },
      emphasis: { focus: "series", itemStyle: { opacity: 1 } },
    })
  );

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
        const [nota, receita] = param.data.value;
        return `<b>${param.data.name}</b><br/>Nota: ${nota.toFixed(2)}<br/>Receita: ${formatCompactUSD(receita)}`;
      },
    },
    xAxis: {
      type: "value",
      name: "Nota Media (IMDb)",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      min: 0,
      max: 10,
      ...darkAxis,
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
