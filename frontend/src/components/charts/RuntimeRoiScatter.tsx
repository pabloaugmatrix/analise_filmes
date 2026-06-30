"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import { darkAxis, darkTooltip } from "@/features/dashboard/chartTheme";
import { formatCompactUSD } from "@/features/dashboard/stats";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
}

// Scatter Runtime x ROI Real (cor continua pela nota, escala Viridis) - espelha o Streamlit
export function RuntimeRoiScatter({ data }: Props) {
  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 64, right: 24, top: 24, bottom: 56 },
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
      dimension: 2,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 4,
      itemHeight: 12,
      text: ["Nota 10", "Nota 0"],
      textStyle: { color: "#94a3b8", fontSize: 11 },
      inRange: { color: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"] },
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
      type: "value",
      name: "ROI Real",
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
        data: data.map((m) => ({
          name: m.title,
          value: [
            m.runtime,
            m.roi_real,
            m.vote_average,
            m.revenue_real,
          ],
        })),
        itemStyle: { opacity: 0.8 },
        emphasis: { itemStyle: { opacity: 1, shadowBlur: 8 } },
      },
    ],
  };

  return <EChart option={option} height={440} />;
}
