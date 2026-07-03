"use client";

import type { EChartsOption } from "echarts";

import type { Movie } from "@/features/dashboard/types";
import {
  buildGenreColorMap,
  darkAxis,
  darkTooltip,
} from "@/features/dashboard/chartTheme";
import { mean, groupBy } from "@/features/dashboard/aggregations";
import { EChart } from "@/components/charts/EChart";

interface Props {
  data: Movie[];
  allGenres: string[];
}

// Timeline: ROI medio por genero ao decorrer dos anos (uma linha por genero).
// Ao mirar uma linha: ela engrossa, as demais escurecem e o nome do genero
// aparece na ponta da linha (alem de a legenda destacar a correspondente).
export function GenreRoiTimeline({ data, allGenres }: Props) {
  const colorMap = buildGenreColorMap(allGenres);

  const years = Array.from(new Set(data.map((m) => m.ano_lancamento))).sort();

  const genresInData =
    allGenres.length === 1
      ? allGenres
      : Array.from(new Set(data.map((m) => m.genre_primary))).sort();

  const series: EChartsOption["series"] = genresInData.map((genre) => {
    const byYear = groupBy(
      data.filter((m) => m.genre_primary === genre),
      (m) => String(m.ano_lancamento)
    );
    return {
      name: genre,
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      connectNulls: true,
      data: years.map((y) => {
        const list = byYear.get(String(y));
        return list && list.length
          ? Number((mean(list.map((m) => m.roi_real)) * 100).toFixed(1))
          : null;
      }),
      lineStyle: { width: 2.5, color: colorMap[genre] },
      itemStyle: { color: colorMap[genre] },
      endLabel: {
        show: false,
      },
      // Destaque ao mirar: engrossa a linha, mostra o nome do genero na ponta
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
      // As demais linhas ficam apagadas quando uma esta em foco
      blur: {
        lineStyle: { opacity: 0.1 },
        itemStyle: { opacity: 0.1 },
      },
    };
  });

  const option: EChartsOption = {
    backgroundColor: "transparent",
    color: genresInData.map((g) => colorMap[g]),
    grid: { left: 104, right: 96, top: 70, bottom: 58 },
    legend: {
      type: "scroll",
      top: 8,
      itemGap: 16,
      textStyle: { color: "#94a3b8", fontSize: 11 },
      itemWidth: 12,
      itemHeight: 8,
    },
    tooltip: {
      ...darkTooltip,
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: "#475569" } },
      // Coloca o genero mirado em destaque (topo da lista) com seu marcador colorido
      formatter: (params: unknown) => {
        const arr = params as Array<{
          seriesName: string;
          value: number | null;
          color: string;
          dataIndex: number;
        }>;
        if (!arr || arr.length === 0) return "";
        const ano = years[arr[0].dataIndex];
        const rows = arr
          .filter((p) => p.value != null)
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;vertical-align:middle"></span><span style="color:#cbd5e1">${p.seriesName}</span>: <b style="color:#fff">${Number(p.value).toFixed(1)}%</b>`
          )
          .join("<br/>");
        return `<div style="font-weight:600;color:#fff;margin-bottom:4px">${ano}</div>${rows}`;
      },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: years.map(String),
      ...darkAxis,
    },
    yAxis: {
      type: "log",
      name: "ROI real medio (%)",
      nameLocation: "end",
      nameGap: 12,
      nameTextStyle: { color: "#cbd5e1", fontSize: 11 },
      ...darkAxis,
      axisLabel: { ...darkAxis.axisLabel, formatter: "{value}%" },
    },
    series,
  };

  return <EChart option={option} height={420} />;
}
