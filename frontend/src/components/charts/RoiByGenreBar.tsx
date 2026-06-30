"use client";

import type { EChartsOption } from "echarts";

import type { GenreStat } from "@/features/dashboard/types";
import { darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import { EChart } from "@/components/charts/EChart";

interface Props {
  stats: GenreStat[];
}

// Barras: ROI Real Medio (%) por Genero - espelha o grafico de barras do Streamlit
export function RoiByGenreBar({ stats }: Props) {
  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 56, right: 32, top: 24, bottom: 80 },
    tooltip: {
      ...darkTooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        const stat = stats.find((s) => s.genre === p.name);
        return `<b>${p.name}</b><br/>
          ROI Medio: ${p.value.toFixed(1)}%<br/>
          Lucro Medio: $${stat ? stat.lucroMedioMilhoes.toFixed(1) : 0}M<br/>
          Filmes: ${stat ? stat.count : 0}`;
      },
    },
    xAxis: {
      type: "category",
      data: stats.map((s) => s.genre),
      ...darkAxis,
      axisLabel: {
        ...darkAxis.axisLabel,
        rotate: 35,
        interval: 0,
      },
    },
    yAxis: {
      type: "value",
      name: "ROI Real Medio (%)",
      nameTextStyle: { color: "#cbd5e1", fontSize: 12 },
      ...darkAxis,
      axisLabel: {
        ...darkAxis.axisLabel,
        formatter: "{value}%",
      },
    },
    series: [
      {
        type: "bar",
        data: stats.map((s) => Number(s.roiMedioPct.toFixed(1))),
        barMaxWidth: 44,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#818cf8" },
              { offset: 1, color: "#4f46e5" },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        label: {
          show: true,
          position: "top",
          color: "#cbd5e1",
          fontSize: 11,
          formatter: "{c}%",
        },
      },
    ],
  };

  return <EChart option={option} height={400} />;
}
