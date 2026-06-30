"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { buildGenreColorMap, darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import { formatCompactUSD, linearRegression, regressionEndpoints } from "@/features/dashboard/stats";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
  allGenres: string[];
}

// Scatter Nota (IMDb) x Lucro Real (cor por genero) + tendencia OLS.
// Responde P6: filmes melhor avaliados tendem a gerar maior lucro?
export function VoteProfitScatter({ data, allGenres }: Props) {
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
        value: [m.vote_average, m.lucro_real],
      })),
      itemStyle: { color: colorMap[genre], opacity: 0.7 },
      emphasis: { focus: "series", itemStyle: { opacity: 1 } },
    })
  );

  // Linha de tendencia OLS sobre todos os pontos (Nota -> Lucro)
  const reg = linearRegression(data.map((m) => ({ x: m.vote_average, y: m.lucro_real })));
  if (reg) {
    const xs = data.map((m) => m.vote_average);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const [yMin, yMax] = regressionEndpoints(xs, reg);
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
    grid: { left: 76, right: 30, top: 60, bottom: 64 },
    legend: {
      type: "scroll",
      top: 8,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    tooltip: {
      ...darkTooltip,
      trigger: "item",
      formatter: (p: unknown) => {
        const param = p as { data: { name?: string; value: number[] } };
        const [nota, lucro] = param.data.value;
        return `<b>${param.data.name}</b><br/>Nota: ${nota.toFixed(2)}<br/>Lucro Real: ${formatCompactUSD(lucro)}`;
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
      name: "Lucro Real",
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
      axisLabel: {
        ...darkAxis.axisLabel,
        formatter: (v: number) => formatCompactUSD(v),
      },
    },
    series,
  };

  return <EChart option={option} height={460} />;
}
