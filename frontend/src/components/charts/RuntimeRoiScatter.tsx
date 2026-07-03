"use client";

import { useState, useCallback } from "react";
import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import { formatCompactUSD } from "@/features/dashboard/stats";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
}

// Scatter Runtime x ROI Real (cor continua pela nota) com slider de filtro.
// O slider fil os dados de verdade (remove os pontos fora do range), evitando
// que pontos invisiveis interfiram no tooltip ao passar o mouse.
export function RuntimeRoiScatter({ data }: Props) {
  const [notaRange, setNotaRange] = useState<[number, number]>([0, 10]);

  const handleRangeChange = useCallback((params: unknown) => {
    const p = params as { selected?: number[] };
    if (p.selected && p.selected.length === 2) {
      setNotaRange([p.selected[0], p.selected[1]]);
    }
  }, []);

  const scatterData = data.filter(
    (m) =>
      m.roi_real > 0 &&
      m.vote_average >= notaRange[0] &&
      m.vote_average <= notaRange[1]
  );

  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 70, right: 30, top: 44, bottom: 110 },
    tooltip: {
      ...darkTooltip,
      trigger: "item",
      formatter: (p: unknown) => {
        const param = p as { data: { name?: string; value: number[] } };
        const [runtime, roi, nota, receita] = param.data.value;
        return `<b>${param.data.name}</b><br/>
          Duracao: ${runtime} min<br/>
          ROI: ${(roi * 100).toFixed(1)}%<br/>
          Nota: ${nota.toFixed(2)}<br/>
          Receita: ${formatCompactUSD(receita)}`;
      },
    },
    visualMap: {
      min: 0,
      max: 10,
      range: [notaRange[0], notaRange[1]],
      dimension: 2,
      calculable: true,
      precision: 2,
      orient: "horizontal",
      left: "center",
      bottom: 10,
      itemWidth: 16,
      itemHeight: 420,
      text: ["Nota 10", "Nota 0"],
      textStyle: { color: "#94a3b8", fontSize: 11 },
      inRange: {
        color: [
          "#dc2626", "#dc2626", "#dc2626", "#dc2626", "#dc2626",
          "#f97316", "#eab308", "#84cc16",
          "#22c55e", "#22c55e", "#22c55e",
        ],
      },
    },
    xAxis: {
      type: "value",
      name: "Duracao (minutos)",
      nameLocation: "middle",
      nameGap: 34,
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
    },
    yAxis: {
      type: "log",
      name: "ROI Real (escala log)",
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
      axisLabel: {
        ...darkAxis.axisLabel,
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
    },
    series: [
      {
        name: "Filmes",
        type: "scatter",
        symbolSize: (val: number[]) => 6 + Math.min(20, val[2] * 2),
        data: scatterData.map((m) => ({
          name: m.title,
          value: [m.runtime, m.roi_real, m.vote_average, m.revenue_real],
        })),
        itemStyle: { opacity: 0.8 },
        emphasis: { itemStyle: { opacity: 1, shadowBlur: 8 } },
      },
    ],
  };

  return (
    <EChart
      option={option}
      height={460}
      onEvents={{ dataRangeSelected: handleRangeChange }}
    />
  );
}
