"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

// Carrega echarts-for-react apenas no cliente (evita acessar window no SSR)
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface EChartProps {
  option: EChartsOption;
  height?: number | string;
  onEvents?: Record<string, (params: unknown) => void>;
}

export function EChart({ option, height = 360, onEvents }: EChartProps) {
  return (
    <ReactECharts
      option={option}
      style={{ height, width: "100%" }}
      notMerge
      lazyUpdate
      opts={{ renderer: "canvas" }}
      onEvents={onEvents}
    />
  );
}
